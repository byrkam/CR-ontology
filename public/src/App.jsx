import React, { useMemo, useState } from "react";

function boxStyle() {
  return {
    background: "white",
    border: "1px solid #dbe4ee",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  };
}

function countMatches(text, patterns) {
  return patterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function extractTokens(text) {
  const tokens = new Set();
  const patterns = [
    /#([A-Za-z][A-Za-z0-9_\-]+)/g,
    /:([A-Za-z][A-Za-z0-9_\-]+)/g,
    /rdf:about="[^"]*#([A-Za-z][A-Za-z0-9_\-]+)"/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      tokens.add(match[1]);
    }
  }

  return Array.from(tokens).slice(0, 30);
}

function analyzeOntology(rawText) {
  const text = rawText || "";
  const lower = text.toLowerCase();

  const summary = {
    decisional: countMatches(text, [/DecisionalAspect/g, /Governance/g, /UserType/g, /UserTeam/g]),
    functional: countMatches(text, [/FunctionalAspect/g, /Monitoring/g, /Simulation/g, /Orchestration/g]),
    informational: countMatches(text, [/InformationalAspect/g, /Scenario/g, /Telemetry/g, /Evidence/g]),
    capabilities: countMatches(text, [/Capability/g, /supportsCapability/g, /AttackSimulation/g, /DefensiveTraining/g]),
  };

  const capabilities = [
    {
      name: "Attack Simulation",
      status: lower.includes("attacksimulation") ? "Inferred" : "Partial",
      confidence: lower.includes("attacksimulation") ? 90 : 55,
      dependencies: ["Scenario Definitions", "Network Topology", "Exercise Logic"],
    },
    {
      name: "Defensive Training",
      status: lower.includes("defensivetraining") || lower.includes("telemetry") ? "Inferred" : "Partial",
      confidence: lower.includes("defensivetraining") || lower.includes("telemetry") ? 84 : 58,
      dependencies: ["Monitoring", "Telemetry", "Blue Team Services"],
    },
    {
      name: "Incident Response Evaluation",
      status: lower.includes("incidentresponse") || lower.includes("evidence") ? "Partial" : "Missing",
      confidence: lower.includes("incidentresponse") || lower.includes("evidence") ? 66 : 35,
      dependencies: ["Assessment Logic", "Evidence Storage", "Evaluation Practice"],
    },
  ];

  const warnings = [];
  if (!lower.includes("federat")) {
    warnings.push("Federated coordination appears unsupported because no federation-related terms were detected.");
  }
  if (!lower.includes("evidence") && !lower.includes("assessment")) {
    warnings.push("Incident response evaluation appears incomplete due to missing evidence or assessment signals.");
  }
  if (!lower.includes("orchestration")) {
    warnings.push("Cross-site orchestration descriptors were not detected in the uploaded ontology.");
  }

  return {
    summary,
    capabilities,
    warnings,
    entities: extractTokens(text),
    totalEntities: extractTokens(text).length,
  };
}

function statusStyle(status) {
  const common = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    marginLeft: "8px",
  };

  if (status === "Inferred") {
    return { ...common, background: "#dcfce7", color: "#166534" };
  }
  if (status === "Partial") {
    return { ...common, background: "#fef3c7", color: "#92400e" };
  }
  return { ...common, background: "#ffe4e6", color: "#be123c" };
}

export default function App() {
  const [fileName, setFileName] = useState("No file uploaded");
  const [fileObject, setFileObject] = useState(null);
  const [rawText, setRawText] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [queryInput, setQueryInput] = useState(
    "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
  );
  const [queryResults, setQueryResults] = useState([]);
  const [queryColumns, setQueryColumns] = useState([]);
  const [queryStatus, setQueryStatus] = useState("No query executed yet.");
  const [loadingQuery, setLoadingQuery] = useState(false);

  const analysis = useMemo(() => analyzeOntology(rawText), [rawText]);

  const filteredEntities = analysis.entities.filter((entity) =>
    entity.toLowerCase().includes(entityFilter.toLowerCase())
  );

  async function handleUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setFileObject(file);

    const text = await file.text();
    setRawText(text);

    setQueryResults([]);
    setQueryColumns([]);
    setQueryStatus("Ontology loaded. Ready to execute SPARQL.");
  }

  async function runQuery() {
    if (!fileObject) {
      setQueryStatus("Please upload an ontology file first.");
      return;
    }

    setLoadingQuery(true);
    setQueryStatus("Running query...");

    try {
      const formData = new FormData();
      formData.append("ontology", fileObject);
      formData.append("query", queryInput);

      const response = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Query execution failed.");
      }

      setQueryColumns(data.columns || []);
      setQueryResults(data.rows || []);
      setQueryStatus(`Query executed successfully. ${data.rows.length} row(s) returned.`);
    } catch (error) {
      setQueryColumns([]);
      setQueryResults([]);
      setQueryStatus(`Error: ${error.message}`);
    } finally {
      setLoadingQuery(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            ...boxStyle(),
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "0.12em", color: "#64748b", fontWeight: 700 }}>
              CYBER RANGE ONTOLOGY DASHBOARD
            </div>
            <h1 style={{ margin: "8px 0 0 0", fontSize: "30px" }}>
              Upload an OWL/RDF file and inspect a practical semantic summary
            </h1>
            <p style={{ marginTop: "10px", color: "#475569", maxWidth: "760px", lineHeight: 1.5 }}>
              This lightweight prototype is designed as a manager- and instructor-facing view over an ontology file.
              It summarizes detected entities, capability signals, possible gaps, and executes SPARQL queries.
            </p>
          </div>

          <label
            style={{
              background: "#0f172a",
              color: "white",
              padding: "12px 16px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Upload ontology file
            <input
              type="file"
              accept=".owl,.rdf,.xml,.ttl,.nt"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={boxStyle()}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>Loaded file</div>
            <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px", wordBreak: "break-word" }}>{fileName}</div>
            <div style={{ fontSize: "14px", color: "#475569", marginTop: "8px" }}>Currently visualized ontology file.</div>
          </div>

          <div style={boxStyle()}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>Detected entities</div>
            <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>{analysis.totalEntities}</div>
            <div style={{ fontSize: "14px", color: "#475569", marginTop: "8px" }}>Approximate identifiers parsed from the upload.</div>
          </div>

          <div style={boxStyle()}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>Capability signals</div>
            <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>{analysis.summary.capabilities}</div>
            <div style={{ fontSize: "14px", color: "#475569", marginTop: "8px" }}>Detected references related to capabilities.</div>
          </div>

          <div style={boxStyle()}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>Warnings</div>
            <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>{analysis.warnings.length}</div>
            <div style={{ fontSize: "14px", color: "#475569", marginTop: "8px" }}>Potential gaps or missing support signals.</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0 }}>Summary of detected CR entities</h2>
            <p style={{ color: "#475569", fontSize: "14px" }}>
              High-level extraction of aspect-related signals from the uploaded ontology.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px" }}>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Decisional</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{analysis.summary.decisional}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px" }}>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Functional</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{analysis.summary.functional}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px" }}>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Informational</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{analysis.summary.informational}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px" }}>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Capabilities</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{analysis.summary.capabilities}</div>
              </div>
            </div>

            <input
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="Filter identifiers"
              style={{
                width: "100%",
                marginTop: "18px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
              {filteredEntities.length > 0 ? (
                filteredEntities.map((entity) => (
                  <span
                    key={entity}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  >
                    {entity}
                  </span>
                ))
              ) : (
                <span style={{ color: "#64748b", fontSize: "14px" }}>
                  Upload a file or adjust the filter to see detected identifiers.
                </span>
              )}
            </div>
          </div>

          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0 }}>Inferred capabilities</h2>
            <p style={{ color: "#475569", fontSize: "14px" }}>
              A manager-facing view of what the ontology instance appears to support.
            </p>

            {analysis.capabilities.map((cap) => (
              <div
                key={cap.name}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "14px",
                  marginTop: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {cap.name}
                      <span style={statusStyle(cap.status)}>{cap.status}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                      {cap.dependencies.map((dep) => (
                        <span
                          key={dep}
                          style={{
                            padding: "5px 8px",
                            borderRadius: "999px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                          }}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Confidence</div>
                    <div style={{ fontSize: "24px", fontWeight: 700 }}>{cap.confidence}%</div>
                  </div>
                </div>
              </div>
            ))}

            <h3 style={{ marginTop: "20px" }}>Warnings and possible inconsistencies</h3>

            {analysis.warnings.length > 0 ? (
              analysis.warnings.map((warning) => (
                <div
                  key={warning}
                  style={{
                    marginTop: "10px",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontSize: "14px",
                  }}
                >
                  {warning}
                </div>
              ))
            ) : (
              <div
                style={{
                  marginTop: "10px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "14px",
                }}
              >
                No obvious gaps were detected.
              </div>
            )}
          </div>
        </div>

        <div style={boxStyle()}>
          <h2 style={{ margin: 0 }}>SPARQL query prompt</h2>
          <p style={{ color: "#475569", fontSize: "14px", marginTop: "8px" }}>
            Enter a SPARQL query and run it against the uploaded ontology.
          </p>

          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            style={{
              width: "100%",
              minHeight: "180px",
              marginTop: "16px",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              fontFamily: "Consolas, monospace",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={runQuery}
              disabled={loadingQuery}
              style={{
                background: "#0f172a",
                color: "white",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                cursor: loadingQuery ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: loadingQuery ? 0.7 : 1,
              }}
            >
              {loadingQuery ? "Running..." : "Run query"}
            </button>

            <button
              onClick={() => setQueryInput("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10")}
              style={{
                background: "#e2e8f0",
                color: "#0f172a",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Load example
            </button>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontSize: "14px",
            }}
          >
            {queryStatus}
          </div>

          {queryColumns.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {queryColumns.map((col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: "left",
                          padding: "10px",
                          borderBottom: "1px solid #e2e8f0",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((row, idx) => (
                    <tr key={idx}>
                      {queryColumns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "14px",
                            verticalAlign: "top",
                          }}
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}