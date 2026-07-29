import { useState, useRef } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { apiClient } from '../../api/client';

interface ImportResult {
  success: boolean;
  clientiCreati: number;
  cantieriCreati: number;
  tipiAttivitaCreati: number;
  righeProcessate: number;
  errori: string[];
}

export function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/import/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template-import.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Errore durante il download del template');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'importazione');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <ResponsabileLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Importazione Massiva</h2>
        <p className="text-sm text-gray-600 mt-1">
          Importa clienti, cantieri e tipi attività da un file Excel
        </p>
      </div>

      {/* Instructions */}
      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Istruzioni</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>1.</strong> Scarica il template Excel cliccando il pulsante qui sotto
          </p>
          <p>
            <strong>2.</strong> Compila il file con i tuoi dati:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Cliente</strong> (obbligatorio): Nome del cliente</li>
            <li><strong>Cantiere</strong> (opzionale): Nome del cantiere (default: "Generico")</li>
            <li><strong>Tipo Attività</strong> (opzionale): Nome del tipo attività</li>
          </ul>
          <p>
            <strong>3.</strong> Carica il file compilato
          </p>
          <p className="text-gray-500 italic">
            Nota: Se un cliente, cantiere o tipo attività esiste già, verrà saltato (no duplicati).
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
          <button
            onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Scarica Template
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Carica File</h3>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx,.xls"
          className="hidden"
        />

        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3"></div>
              <p className="text-gray-600">Importazione in corso...</p>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 mb-1">
                Clicca per selezionare un file Excel
              </p>
              <p className="text-sm text-gray-400">
                Formati supportati: .xlsx, .xls (max 5MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-800">Errore</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card mb-6 ${result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${result.success ? 'text-green-600' : 'text-yellow-600'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {result.success ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <div className="flex-1">
              <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
                {result.success ? 'Importazione completata' : 'Importazione completata con avvisi'}
              </h4>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.righeProcessate}</p>
                  <p className="text-xs text-gray-500">Righe processate</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">{result.clientiCreati}</p>
                  <p className="text-xs text-gray-500">Clienti creati</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">{result.cantieriCreati}</p>
                  <p className="text-xs text-gray-500">Cantieri creati</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">{result.tipiAttivitaCreati}</p>
                  <p className="text-xs text-gray-500">Tipi creati</p>
                </div>
              </div>

              {result.errori.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">Avvisi ({result.errori.length}):</p>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                    {result.errori.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ResponsabileLayout>
  );
}
