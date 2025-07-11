import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

// --- Initialize Firebase ---
let app;
let db;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

// --- Main App Component ---
export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    };

    const q = query(collection(db, "vehicles"), orderBy("customerName"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const vehiclesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVehicles(vehiclesData);
      setLoading(false);
    }, (error) => {
        console.error("Firestore error: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!db) {
      return (
          <div style={styles.errorContainer}>
              <h1>Configuration Error</h1>
              <p>Firebase environment variables are not set correctly. Please check your Netlify site settings.</p>
          </div>
      );
  }

  if (loading) {
    return <div style={styles.loading}>Loading Workshop Dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <Header />
      <VehicleList vehicles={vehicles} />
      <AddVehicleForm />
    </div>
  );
}

// --- Header Component ---
const Header = () => (
  <header style={styles.header}>
    <h1>McCarthy Toyota Ballito - Service Dashboard</h1>
    <p>Update vehicle statuses here to inform the customer-facing chatbot.</p>
  </header>
);

// --- Vehicle List Component ---
const VehicleList = ({ vehicles }) => (
  <div style={styles.listContainer}>
    {vehicles.map(vehicle => (
      <VehicleCard key={vehicle.id} vehicle={vehicle} />
    ))}
  </div>
);

// --- Individual Vehicle Card Component ---
const VehicleCard = ({ vehicle }) => {
  const statuses = [
    "Booked In", "In Wash Bay", "In Workshop", "Awaiting Parts",
    "Quality Check", "Final Wash & Vacuum", "Ready for Collection", "Invoiced & Completed"
  ];

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const vehicleRef = doc(db, "vehicles", vehicle.id);
    try {
      await updateDoc(vehicleRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  return (
    <div style={styles.card}>
      <h3>{vehicle.make} {vehicle.model}</h3>
      <p><strong>Customer:</strong> {vehicle.customerName}</p>
      <p><strong>Registration:</strong> {vehicle.registration}</p>
      <div style={styles.statusSelector}>
        <label htmlFor={`status-${vehicle.id}`}>Current Status: </label>
        <select
          id={`status-${vehicle.id}`}
          value={vehicle.status}
          onChange={handleStatusChange}
          style={styles.select}
        >
          {statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// --- Add Vehicle Form ---
const AddVehicleForm = () => {
    const [customerName, setCustomerName] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [registration, setRegistration] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!customerName || !make || !model || !registration) {
            alert("Please fill out all fields.");
            return;
        }
        try {
            await addDoc(collection(db, "vehicles"), {
                customerName,
                make,
                model,
                registration,
                status: "Booked In",
                serviceAdvisor: "Busi",
                estimatedCompletionTime: "Not set"
            });
            setCustomerName('');
            setMake('');
            setModel('');
            setRegistration('');
        } catch (error) {
            console.error("Error adding vehicle: ", error);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <h2>Add New Vehicle</h2>
            <input style={styles.input} type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name" />
            <input style={styles.input} type="text" value={make} onChange={e => setMake(e.target.value)} placeholder="Make (e.g., Toyota)" />
            <input style={styles.input} type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Model (e.g., Hilux)" />
            <input style={styles.input} type="text" value={registration} onChange={e => setRegistration(e.target.value)} placeholder="Registration No." />
            <button type="submit" style={styles.button}>Add Vehicle</button>
        </form>
    );
};

// --- Basic Styling ---
const styles = {
  container: { fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f4f7fa' },
  header: { textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '20px' },
  loading: { fontSize: '24px', textAlign: 'center', padding: '50px' },
  errorContainer: { padding: '50px', textAlign: 'center', color: 'red' },
  listContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  statusSelector: { marginTop: '15px' },
  select: { padding: '8px', fontSize: '16px', width: '100%', borderRadius: '4px' },
  form: { marginTop: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: 'white' },
  input: { display: 'block', width: 'calc(100% - 20px)', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px 20px', backgroundColor: '#d92d27', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }
};

