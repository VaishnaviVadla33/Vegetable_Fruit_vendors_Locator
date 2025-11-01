# -*- coding: utf-8 -*-
import os
import json
import traceback

# --- Disable ChromaDB Telemetry FIRST (before any imports) ---
os.environ['ANONYMIZED_TELEMETRY'] = 'False'

# Set cache directories to /tmp (Lambda's writable directory)
os.environ['TRANSFORMERS_CACHE'] = '/tmp/transformers_cache'
os.environ['HF_HOME'] = '/tmp/huggingface'
os.environ['TORCH_HOME'] = '/tmp/torch'

# --- Core Dependencies ---
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Langchain Imports (Corrected for v1.0.0+)
from langchain_text_splitters import RecursiveCharacterTextSplitter
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI

# Core chain functions
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# Community components
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.chat_message_histories import ChatMessageHistory

# Core components
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough


# --- Global Variables ---
qa_chain = None
is_initialized = False
memory_store = {}
knowledge_documents = []

# --- Initialization Function ---
def initialize_chatbot():
    """Loads data, sets up models, embeddings, vector store, and the RAG chain."""
    global qa_chain, is_initialized, memory_store, knowledge_documents
    if is_initialized:
        print("Chatbot already initialized.")
        return

    print("Starting Chatbot Initialization...")
    load_dotenv()

    # --- Firebase Admin SDK Initialization ---
    if not firebase_admin._apps:
        try:
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "firebase-credentials.json")
            if not os.path.exists(cred_path):
                 script_dir = os.path.dirname(os.path.abspath(__file__))
                 cred_path_relative = os.path.join(script_dir, "firebase-credentials.json")
                 if os.path.exists(cred_path_relative):
                     cred_path = cred_path_relative
                     print(f"Using relative credential path: {cred_path}")
                 else:
                    raise ValueError(f"Credential file '{cred_path}' not found.")

            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                 'projectId': os.getenv("FIREBASE_PROJECT_ID", "veggievendor01"),
            })
            print("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            print(f"FATAL: Error initializing Firebase Admin SDK: {e}")
            return
    else:
        print("Firebase Admin SDK already initialized.")

    # Get Firestore client
    try:
        db = firestore.client()
        print("Firestore client obtained.")
    except Exception as e:
        print(f"FATAL: Error getting Firestore client: {e}")
        return

    # Get OpenRouter API key AFTER loading .env
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_api_key:
        print("FATAL: OPENROUTER_API_KEY not found in environment variables.")
        return
    os.environ["OPENAI_API_KEY"] = openrouter_api_key

    # --- Load and Prepare Data from Firestore ---
    print("Loading recipes and vendors from Firestore...")
    all_docs_for_vectorstore = []
    knowledge_documents = []
    try:
        # Load Recipes
        recipes_ref = db.collection(u'recipes')
        recipes_stream = recipes_ref.stream()
        for doc in recipes_stream:
             recipe = doc.to_dict()
             recipe['id'] = doc.id
             if not recipe.get('title') or not recipe.get('category') or not recipe.get('ingredients') or not recipe.get('method'):
                 print(f"Skipping recipe {doc.id}: Missing required fields.")
                 continue

             text = f"Recipe Title: {recipe.get('title')}\nCategory: {recipe.get('category')}\nDescription: {recipe.get('description', 'N/A')}\n\n"
             text += "Ingredients:\n" + "".join([f"- {ing}\n" for ing in recipe.get('ingredients', [])]) + "\n"
             text += "Method:\n" + "".join([f"{j+1}. {step}\n" for j, step in enumerate(recipe.get('method', []))]) + "\n"
             metadata = {"type": "recipe", "recipe_id": recipe.get('id'), "title": recipe.get('title'), "category": recipe.get('category')}
             all_docs_for_vectorstore.append(Document(page_content=text, metadata=metadata))
             knowledge_documents.append({'type':'recipe','id':metadata.get('recipe_id'),'title':metadata.get('title')})

        print(f"Loaded {len(knowledge_documents)} valid recipes.")

        # Load Vendors
        vendors_ref = db.collection(u'vendors')
        vendors_stream = vendors_ref.stream()
        vendor_count = 0
        for doc in vendors_stream:
            v = doc.to_dict()
            v['id'] = doc.id
            if not v.get('vendorName') or v.get('lat') is None or v.get('lng') is None:
                print(f"Skipping vendor {doc.id}: Missing name or coordinates.")
                continue

            v_text = f"Vendor Name: {v.get('vendorName')}\nContact: {v.get('contact', 'N/A')}\n"
            v_text += f"Location Coordinates: {v.get('lat')}, {v.get('lng')}\n"
            products = v.get('products', [])
            if products:
                v_text += "Products Available:\n" + "\n".join([f"- {p}" for p in products]) + "\n"
            if v.get('imageBase64'):
                 v_text += "Note: This vendor has provided an image.\n"

            v_meta = {'type': 'vendor', 'vendor_id': v.get('id'), 'vendor_name': v.get('vendorName')}
            all_docs_for_vectorstore.append(Document(page_content=v_text, metadata=v_meta))
            knowledge_documents.append({'type':'vendor','id':v_meta.get('vendor_id'),'vendor_name':v_meta.get('vendor_name')})
            vendor_count += 1
        print(f"Loaded {vendor_count} valid vendors.")

        if not all_docs_for_vectorstore:
            print("WARNING: No valid recipes or vendors found. Adding dummy document.")
            all_docs_for_vectorstore.append(Document(page_content="No information available.", metadata={"source": "system_empty"}))

    except Exception as e:
        print(f"ERROR during Firestore loading: {e}")
        traceback.print_exc()
        all_docs_for_vectorstore = [Document(page_content="Error loading data.", metadata={"source": "system_error"})]

    # --- Split Documents ---
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    split_docs = text_splitter.split_documents(all_docs_for_vectorstore)
    print(f"Split data into {len(split_docs)} chunks.")

    # --- Initialize Embeddings ---
    print("Initializing embeddings model...")
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-MiniLM-L3-v2",
            model_kwargs={'device': 'cpu'},
            cache_folder='/tmp/huggingface'
        )
    except Exception as e:
        print(f"FATAL: Failed to load embeddings model: {e}")
        return

    # --- Create Vector Store (In Memory) ---
    print("Creating vector store (ChromaDB in-memory)...")
    try:
        vector_db = Chroma.from_documents(documents=split_docs, embedding=embeddings)
        print("Vector store created successfully.")
    except Exception as e:
        print(f"FATAL: Error creating vector store: {e}")
        return

    # --- Initialize LLM (OpenRouter) ---
    print("Initializing LLM via OpenRouter...")
    try:
        try:
             from langchain_openai import ChatOpenAI
        except ImportError:
             from langchain_community.chat_models import ChatOpenAI

        llm = ChatOpenAI(
            model="openai/gpt-3.5-turbo",
            temperature=0.3,
            openai_api_base="https://openrouter.ai/api/v1",
            openai_api_key=openrouter_api_key,
            max_tokens=800
        )
    except Exception as e:
        print(f"FATAL: Error initializing LLM: {e}")
        return

    # --- Define Memory Management ---
    def get_session_history(session_id: str) -> BaseChatMessageHistory:
        """Retrieves or creates an in-memory chat history."""
        if session_id not in memory_store:
            memory_store[session_id] = ChatMessageHistory()
            print(f"Created new in-memory history for session: {session_id}")
        return memory_store[session_id]

    # --- Create Prompts and RAG Chain ---
    print("Creating Prompts and RAG Chain...")
    try:
        retriever = vector_db.as_retriever(search_kwargs={"k": 6})

        contextualize_q_system_prompt = (
            "Given a chat history and the latest user question "
            "which might reference context in the chat history, "
            "formulate a standalone question which can be understood "
            "without the chat history. Do NOT answer the question, "
            "just reformulate it if needed and otherwise return it as is."
        )
        contextualize_q_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        history_aware_retriever = create_history_aware_retriever(
            llm, retriever, contextualize_q_prompt
        )

        qa_system_prompt = (
            "You are an assistant for recipes, local vendors, and orders. "
            "Use the retrieved context (recipes, vendors with products/contacts, order info) to answer questions. "
            "\n\nFor complex questions:"
            "\n1. First identify what information is needed (recipe ingredients? vendor products? owner contact?)"
            "\n2. Search through ALL provided context carefully"
            "\n3. Combine information from multiple sources if needed"
            "\n\nWhen asked about:"
            "\n- Recipe ingredients → Check recipe details, then find vendors selling those items"
            "\n- Ordering a recipe → Provide the recipe OWNER's contact (uploaderName field), NOT vendors"
            "\n- Vendors → List ALL vendors mentioned in context with their products"
            "\n\nIf information is missing, say so clearly. Keep answers helpful and concise."
            "\n\nContext:\n{context}"
        )
        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", qa_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        conversational_rag_chain = RunnableWithMessageHistory(
            rag_chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )

        qa_chain = conversational_rag_chain
        print("Chatbot Chain Ready!")
        is_initialized = True

    except Exception as e:
        print(f"FATAL: Error creating RAG chain: {e}")
        traceback.print_exc()

# --- Lambda Handler Function ---
def lambda_handler(event, context):
    """AWS Lambda handler function."""
    global qa_chain, is_initialized

    if not is_initialized:
        print("First invocation or cold start: Initializing chatbot...")
        initialize_chatbot()
        if not is_initialized or qa_chain is None:
             print("Initialization failed, cannot process request.")
             return {
                'statusCode': 503,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({"error": "Chatbot is not ready. Initialization failed."})
            }
        print("Initialization complete.")

    try:
        print(f"Received event: {json.dumps(event)[:500]}...")

        # Handle CORS preflight OPTIONS request - CHECK BOTH FORMATS
        request_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
        
        if request_method == 'OPTIONS':
             print("Handling OPTIONS preflight request")
             return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                },
                'body': json.dumps({})
             }

        if request_method != 'POST':
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": "Method not allowed. Use POST."})
            }

        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": "Invalid JSON body provided."})
            }

        question = body.get('question', '').strip()
        session_id = body.get('sessionId', 'default_shared_session')

        if not question:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": "Question cannot be empty."})
            }

        print(f"Processing question for session '{session_id}': {question}")

        result = qa_chain.invoke(
            {"input": question},
            config={"configurable": {"session_id": session_id}}
        )

        answer = result.get("answer", "Sorry, I encountered a problem generating a response.")
        print(f"Generated answer for session '{session_id}': {answer}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"answer": answer})
        }

    except Exception as e:
        print(f"ERROR during Lambda handler execution: {e}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"error": "An internal server error occurred."})
        }