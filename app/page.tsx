export default function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Dipol Butik API</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Backend API çalışıyor</p>
      <div style={{ background: '#f5f5f5', padding: '2rem', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>API Endpoints:</h2>
        <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '0.5rem 0' }}>POST /api/auth/register</li>
          <li style={{ padding: '0.5rem 0' }}>POST /api/auth/login</li>
          <li style={{ padding: '0.5rem 0' }}>GET /api/products</li>
          <li style={{ padding: '0.5rem 0' }}>GET /api/categories</li>
          <li style={{ padding: '0.5rem 0' }}>GET /api/orders</li>
        </ul>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888' }}>
          Port: 3002
        </p>
      </div>
    </div>
  );
}
