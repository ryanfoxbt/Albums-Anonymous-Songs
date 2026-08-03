export function OgImageContent() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>
        <span style={{ display: "flex" }}>Albums&nbsp;</span>
        <span style={{ display: "flex", color: "#F760D6" }}>Anonymous</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 32,
          marginTop: 28,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        Funny original songs & a comedy podcast about albums
      </div>
    </div>
  );
}
