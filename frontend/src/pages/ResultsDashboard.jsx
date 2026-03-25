import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@heroui/react';
import ResponseDetails from '../components/ResponseDetails';

export default function ResultsDashboard() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const response = await axios.get(`/api/surveys/${id}/results`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await axios.get(`/api/surveys/${id}/results/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${id}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      setError('Export failed');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading results...</div>;
  if (error) return (
    <div style={{ padding: '20px', color: 'red' }}>
      {error}
      <br />
      <Link to="/">Back to Dashboard</Link>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2>Results: {data.surveyTitle}</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button size="sm" color="primary" variant="flat" onPress={handleExportCsv}>Export CSV</Button>
          <Link to="/" style={{ textDecoration: 'none', color: '#007bff' }}>Back to Dashboard</Link>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
        <p><strong>Total Responses:</strong> {data.totalResponses}</p>
        <p><strong>Privacy Mode:</strong> {data.isAnonymous ? 'Anonymous' : 'Identified'}</p>
        {data.completion && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
            <p><strong>Completion:</strong> {data.completion.responded.length} responded, {data.completion.notResponded.length} not yet</p>
            {data.completion.notResponded.length > 0 && (
              <details style={{ marginTop: '8px' }}>
                <summary>Not responded</summary>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {data.completion.notResponded.map((u) => (
                    <li key={u.id}>{u.displayName || u.username}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <h3>Summary by Question</h3>
      <div style={{ display: 'grid', gap: '20px' }}>
        {data.results.map(q => (
          <div key={q.questionId} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0 }}>{q.questionText}</h4>
            {q.type === 'ranking' && q.rankingSummary ? (
              <div>
                <p style={{ color: '#666', marginBottom: '12px' }}>Average rank (1 = first choice)</p>
                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                  {q.rankingSummary.map((row, i) => (
                    <li key={row.option} style={{ marginBottom: '8px' }}>
                      <strong>{row.option}</strong>
                      {row.averageRank != null && ` — Avg rank: ${row.averageRank} (${row.totalVotes} votes)`}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(q.options || []).map(opt => {
                  const count = (q.counts && q.counts[opt]) || 0;
                  const percentage = data.totalResponses > 0 
                    ? Math.round((count / data.totalResponses) * 100) 
                    : 0;
                  return (
                    <div key={opt}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>{opt}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#e9ecef', borderRadius: '5px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            backgroundColor: '#007bff',
                            transition: 'width 0.5s ease-in-out'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <ResponseDetails 
        responses={data.detailedResponses} 
        questions={data.results} 
        isAnonymous={data.isAnonymous}
      />
    </div>
  );
}
