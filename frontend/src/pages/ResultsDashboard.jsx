import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Card, CardHeader, CardBody, Progress, Chip, Divider } from '@heroui/react';
import ResponseDetails from '../components/ResponseDetails';

export default function ResultsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-6 rounded-2xl border border-rose-100 dark:border-rose-800 mb-6">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p className="font-bold">{error}</p>
        </div>
        <Button color="primary" variant="flat" onPress={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-display">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
          <h1 className="text-3xl font-black tracking-tight">{data.surveyTitle}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Chip color="primary" variant="flat" size="sm" className="font-bold">
              {data.totalResponses} Responses
            </Chip>
            <Chip color={data.isAnonymous ? "warning" : "success"} variant="flat" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
              {data.isAnonymous ? 'Anonymous' : 'Identified'}
            </Chip>
          </div>
        </div>
        <Button 
          color="primary" 
          shadow 
          className="font-bold px-6"
          startContent={<span className="material-symbols-outlined">download</span>}
          onPress={handleExportCsv}
        >
          Export CSV
        </Button>
      </header>

      {data.completion && (
        <Card className="border-none bg-slate-100 dark:bg-slate-900 shadow-none">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Response Tracking</h3>
              <span className="text-xs font-bold text-slate-400">
                {data.completion.responded.length} active / {data.completion.notResponded.length} pending
              </span>
            </div>
            {data.completion.notResponded.length > 0 ? (
              <details className="group">
                <summary className="text-sm font-bold text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
                  View {data.completion.notResponded.length} pending respondents
                </summary>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {data.completion.notResponded.map((u) => (
                    <div key={u.id} className="bg-white dark:bg-slate-800 p-2 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-center truncate">
                      {u.displayName || u.username}
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                All assigned users have responded!
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          Summary by Question
        </h2>
        
        <div className="grid gap-6">
          {data.results.map(q => (
            <Card key={q.questionId} className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6">
                <h4 className="font-bold text-lg leading-tight">{q.questionText}</h4>
              </CardHeader>
              <CardBody className="p-6">
                {q.type === 'ranking' && q.rankingSummary ? (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preference Breakdown (Lower is better)</p>
                    <div className="space-y-3">
                      {q.rankingSummary.map((row, i) => (
                        <div key={row.option} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{row.option}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Avg Rank: {row.averageRank} • {row.totalVotes} votes
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(q.options || []).map(opt => {
                      const count = (q.counts && q.counts[opt]) || 0;
                      const percentage = data.totalResponses > 0 
                        ? Math.round((count / data.totalResponses) * 100) 
                        : 0;
                      return (
                        <div key={opt} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{opt}</span>
                            <span className="text-xs font-black text-primary">{count} ({percentage}%)</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            color="primary"
                            size="md"
                            radius="full"
                            classNames={{
                              indicator: "bg-primary",
                              track: "bg-slate-100 dark:bg-slate-800"
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Divider className="my-12 bg-slate-200 dark:bg-slate-800" />

      <ResponseDetails 
        responses={data.detailedResponses} 
        questions={data.results} 
        isAnonymous={data.isAnonymous}
      />
    </div>
  );
}
