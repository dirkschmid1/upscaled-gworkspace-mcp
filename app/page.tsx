export default function Home() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '80px auto',
      padding: 40, textAlign: 'center'
    }}>
      <h1>🏢 Upscaled Google Workspace MCP</h1>
      <p style={{ color: '#666', marginBottom: 10 }}>
        Multi-User Google Workspace Integration für Claude Team Plan
      </p>
      <p style={{ color: '#888', marginBottom: 30, fontSize: 14 }}>
        Gmail · Calendar · Drive
      </p>
      <a
        href="/auth/login"
        style={{
          display: 'inline-block', padding: '14px 32px',
          background: '#0F7173', color: 'white', borderRadius: 8,
          textDecoration: 'none', fontWeight: 'bold', fontSize: 16,
        }}
      >
        Google Account verbinden
      </a>
      <div style={{
        marginTop: 40, padding: 20, background: '#f8f9fa',
        borderRadius: 8, textAlign: 'left', fontSize: 14
      }}>
        <p style={{ margin: '8px 0' }}>📧 <strong>Gmail:</strong> Emails suchen, lesen, Drafts erstellen, Labels verwalten</p>
        <p style={{ margin: '8px 0' }}>📅 <strong>Calendar:</strong> Termine anzeigen, erstellen, ändern, löschen</p>
        <p style={{ margin: '8px 0' }}>📁 <strong>Drive:</strong> Dateien suchen, lesen, Google Docs erstellen, hochladen</p>
      </div>
      <p style={{ color: '#999', marginTop: 30, fontSize: 12 }}>
        Es werden nur Entwürfe erstellt – niemals Emails direkt gesendet.
        Nur User mit @upscaled-media.de können sich verbinden.
      </p>
    </div>
  );
}
