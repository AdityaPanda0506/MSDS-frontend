import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaSpinner, FaCheck, FaTimes, FaDownload, FaFlask, FaSearch, FaInfoCircle } from 'react-icons/fa';

const API_BASE = "http://localhost:5000";

export default function SDSGenerator() {
  const [smiles, setSmiles] = useState('');
  const [sds, setSds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState(null);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  // Check backend status on component mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Validate SMILES as user types (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (smiles.trim() && smiles.length > 2) {
        validateSmiles(smiles);
      } else {
        setValidation(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [smiles]);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      setBackendStatus(response.ok ? 'online' : 'error');
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  const validateSmiles = async (smilesString) => {
    try {
      const response = await fetch(`${API_BASE}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles: smilesString })
      });
      const data = await response.json();
      setValidation(data);
    } catch (err) {
      setValidation({ valid: false, error: 'Validation failed' });
    }
  };

  const generateSDS = async () => {
    if (!smiles.trim()) {
      setError('Please enter a SMILES string');
      return;
    }

    setLoading(true);
    setError('');
    setSds(null);

    try {
      const response = await fetch(`${API_BASE}/api/sds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles: smiles.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setSds(data);
    } catch (err) {
      setError(err.message);
      setSds(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (format) => {
    if (!smiles.trim()) {
      setError('Please enter a SMILES string first');
      return;
    }

    setDownloadingFormat(format);
    try {
      let endpoint = '';
      let filename = '';
      
      switch (format) {
        case 'docx':
          endpoint = '/api/sds/docx';
          filename = 'sds_report.docx';
          break;
        case 'json':
          endpoint = '/api/sds/json';
          filename = 'sds_report.json';
          break;
        default:
          throw new Error('Invalid format');
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles: smiles.trim() })
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(`Download failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const clearForm = () => {
    setSmiles('');
    setSds(null);
    setError('');
    setValidation(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <FaCheck className="text-green-500" />;
      case 'offline': return <FaTimes className="text-red-500" />;
      case 'error': return <FaExclamationTriangle className="text-yellow-500" />;
      default: return <FaSpinner className="animate-spin text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <FaFlask className="text-4xl text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">SDS Generator</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Generate comprehensive Safety Data Sheets from SMILES molecular notation
          </p>
          
          {/* Backend Status */}
          <div className="flex justify-center items-center gap-2 mt-4 text-sm">
            {getStatusIcon(backendStatus)}
            <span className="text-gray-600">
              Backend: {backendStatus.charAt(0).toUpperCase() + backendStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-3 mb-4">
            <div className="flex-grow relative">
              <input
                type="text"
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                placeholder="Enter SMILES notation (e.g., CCO for ethanol, CC(=O)O for acetic acid)"
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  validation?.valid === false 
                    ? 'border-red-300 focus:ring-red-500' 
                    : validation?.valid === true
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={loading}
              />
              
              {/* Validation indicator */}
              {validation && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validation.valid ? (
                    <FaCheck className="text-green-500" />
                  ) : (
                    <FaTimes className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={generateSDS}
              disabled={loading || !smiles.trim() || validation?.valid === false}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FaSearch />
                  Generate SDS
                </>
              )}
            </button>

            {(smiles || sds) && (
              <button
                onClick={clearForm}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                title="Clear form"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Validation feedback */}
          {validation && (
            <div className={`p-3 rounded-lg text-sm ${
              validation.valid 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {validation.valid ? (
                <div>
                  <strong>Valid SMILES:</strong> {validation.canonical_smiles}
                  <br />
                  <span className="text-xs">
                    Formula: {validation.molecular_formula} | MW: {validation.molecular_weight}g/mol
                  </span>
                </div>
              ) : (
                <div>
                  <strong>Invalid SMILES:</strong> {validation.error}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle />
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </div>

        {/* Download Options */}
        {sds && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaDownload />
              Download Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button 
                onClick={() => downloadFile('docx')}
                disabled={downloadingFormat === 'docx'}
                className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {downloadingFormat === 'docx' ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload />
                )}
                Download Word Document (.docx)
              </button>
              
              <button 
                onClick={() => downloadFile('json')}
                disabled={downloadingFormat === 'json'}
                className="flex items-center justify-center gap-2 p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {downloadingFormat === 'json' ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload />
                )}
                Download JSON Data (.json)
              </button>
            </div>
          </div>
        )}

        {/* SDS Display */}
        {sds && <SDSDisplay sds={sds} />}
      </div>
    </div>
  );
}

function SDSDisplay({ sds }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['Section1', 'Section3']));
  
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const expandAllSections = () => {
    const allSections = Object.keys(sds.sds || sds).filter(key => key.startsWith('Section'));
    setExpandedSections(new Set(allSections));
  };

  const collapseAllSections = () => {
    setExpandedSections(new Set());
  };

  const renderValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-500 italic">Not available</span>;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const stringValue = String(value);
      // Check if it's a long string that should be formatted
      if (stringValue.length > 100) {
        return (
          <div className="text-sm">
            <div className="whitespace-pre-wrap">{stringValue}</div>
          </div>
        );
      }
      return stringValue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500 italic">None listed</span>;
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((v, i) => (
            <li key={i} className="text-sm">{renderValue(v)}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="border-l-2 border-gray-200 pl-3">
              <div className="font-medium text-gray-700">{k}:</div>
              <div className="ml-2">{renderValue(v)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(value, null, 2)}</pre>;
  };

  const sdsData = sds.sds || sds;
  const metadata = sds.metadata;

  // Get compound name for header
  const compoundName = sdsData?.Section1?.data?.["Product Identifier"] || "Unknown Compound";

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* SDS Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Safety Data Sheet (SDS)</h1>
          <h2 className="text-xl">{compoundName}</h2>
          {metadata && (
            <p className="text-blue-100 text-sm mt-2">
              Generated: {new Date(metadata.generation_time).toLocaleString()}
              {metadata.canonical_smiles && ` | SMILES: ${metadata.canonical_smiles}`}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Click section headers to expand/collapse content
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAllSections}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Expand All
          </button>
          <button
            onClick={collapseAllSections}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-200">
        {Object.keys(sdsData)
          .filter((key) => key.startsWith("Section"))
          .sort((a, b) => {
            const numA = parseInt(a.replace('Section', ''));
            const numB = parseInt(b.replace('Section', ''));
            return numA - numB;
          })
          .map((sectionKey) => {
            const section = sdsData[sectionKey];
            if (!section || !section.data) return null;

            const isExpanded = expandedSections.has(sectionKey);
            const sectionNum = sectionKey.replace('Section', '');
            const isHazardSection = sectionKey === 'Section3';

            return (
              <div key={sectionKey}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isHazardSection && (
                        <FaExclamationTriangle className="text-red-500 text-lg" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Section {sectionNum}: {section.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {Object.keys(section.data).length} properties
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </div>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(section.data).map(([key, value]) => (
                            <tr key={key} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-700 w-1/3 align-top">
                                {key}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {renderValue(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section metadata */}
                    {(section.data_sources || section.notes) && (
                      <div className="mt-4 text-xs text-gray-600 space-y-1">
                        {section.data_sources && section.data_sources.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FaInfoCircle className="text-blue-500" />
                            <span>Sources: {section.data_sources.join(', ')}</span>
                          </div>
                        )}
                        {section.notes && section.notes.length > 0 && (
                          <div className="italic">
                            Notes: {section.notes.join('; ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 text-xs text-gray-600 text-center">
        This SDS has been generated using computational methods for research purposes only.
        Always verify information through laboratory testing and consult authoritative sources.
      </div>
    </div>
  );
}
