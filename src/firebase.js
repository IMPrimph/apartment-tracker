import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

console.log('Firebase Config:', firebaseConfig)

let app
let db

export const initializeFirebase = () => {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
}

export const addExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt: new Date()
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding expense:', error)
    throw error
  }
}

export const getExpenses = async () => {
  try {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    const expenses = []
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() })
    })
    return expenses
  } catch (error) {
    console.error('Error getting expenses:', error)
    throw error
  }
}

export const updateExpense = async (id, expenseData) => {
  try {
    const expenseRef = doc(db, 'expenses', id)
    await updateDoc(expenseRef, {
      ...expenseData,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

export const deleteExpense = async (id) => {
  try {
    await deleteDoc(doc(db, 'expenses', id))
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}