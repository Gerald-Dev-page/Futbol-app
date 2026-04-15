const API_URL = import.meta.env.VITE_GOOGLE_API_URL;

// Variable global en memoria para almacenar la caché
let globalCache = null;

export const fetchAppData = async (forceRefresh = false) => {
  try {
    // Si ya tenemos los datos en caché y no estamos forzando la actualización, devolvemos la caché instantáneamente
    if (globalCache && !forceRefresh) {
      return globalCache;
    }

    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Error en la conexión con la red');
    
    const result = await response.json();
    if (result.status === 'success') {
      globalCache = result.data; // Guardamos en la caché
      return globalCache;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const insertRecord = async (action, data) => {
  try {
    const payload = { action, data };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message);
    }
    
    // Al insertar un dato nuevo, destruimos la caché para que la próxima lectura traiga los datos frescos
    globalCache = null; 
    
    return result;
  } catch (error) {
    console.error(`Error executing ${action}:`, error);
    throw error;
  }
};