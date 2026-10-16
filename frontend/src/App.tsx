function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="logo" aria-hidden="true">LD</div>
        <p className="eyebrow">LOCAL DOCUMENT WORKSPACE</p>
        <h1>Welcome to LocalDocs</h1>
        <p className="intro">
          A simple, local-first place to manage your documents.
          Your workspace foundation is running.
        </p>
        <div className="status">
          <span className="status-dot" />
          Frontend is running
        </div>
      </section>
      <section className="next">
        <h2>Coming next</h2>
        <p>
          In the next stage, we will connect FastAPI to SeaweedFS so you can
          upload and retrieve real files.
        </p>
      </section>
      <footer>LocalDocs · Stage 1 · Local development</footer>
    </main>
  );
}

export default App;
