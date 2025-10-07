import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query, enableIndexedDbPersistence } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let app
let db

const CACHE_KEY = 'apartment_tracker_expenses_cache'

const persistExpensesToCache = (expenses) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(expenses))
  } catch (error) {
    console.warn('Unable to persist expenses cache:', error)
  }
}

const loadExpensesFromCache = () => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.warn('Unable to read expenses cache:', error)
    return null
  }
}

const updateCache = (mutator) => {
  const current = loadExpensesFromCache() || []
  const next = mutator(current)
  persistExpensesToCache(next)
}

const initializeFirebasePromise = (async () => {
  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)

    try {
      await enableIndexedDbPersistence(db)
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore persistence: Multiple tabs open, continuing without offline cache.')
      } else if (error.code === 'unimplemented') {
        console.warn('Firestore persistence unsupported in this browser.')
      } else {
        console.warn('Firestore persistence error:', error)
      }
    }
  }

  return db
})()

export const initializeFirebase = () => initializeFirebasePromise

export const addExpense = async (expenseData) => {
  try {
    const createdAt = new Date()
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt
    })
    updateCache((expenses) => [
      {
        id: docRef.id,
        ...expenseData,
        createdAt: createdAt.toISOString()
      },
      ...expenses.filter(entry => entry.id !== docRef.id)
    ])
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
    persistExpensesToCache(expenses)
    return expenses
  } catch (error) {
    console.error('Error getting expenses:', error)
    const cachedExpenses = loadExpensesFromCache()
    if (cachedExpenses) {
      return cachedExpenses
    }
    throw error
  }
}

export const updateExpense = async (id, expenseData) => {
  try {
    const expenseRef = doc(db, 'expenses', id)
    const updatedAt = new Date()
    await updateDoc(expenseRef, {
      ...expenseData,
      updatedAt
    })
    updateCache((expenses) => expenses.map(entry =>
      entry.id === id
        ? { ...entry, ...expenseData, updatedAt: updatedAt.toISOString() }
        : entry
    ))
  } catch (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

export const deleteExpense = async (id) => {
  try {
    await deleteDoc(doc(db, 'expenses', id))
    updateCache((expenses) => expenses.filter(entry => entry.id !== id))
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}
