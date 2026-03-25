import React from 'react';
import { Card, CardHeader, CardBody, Chip } from '@heroui/react';

export default function ResponseDetails({ responses, questions, isAnonymous }) {
  if (!responses || responses.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
        <p className="text-slate-500 font-medium">No individual responses yet.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person_search</span>
          Individual Responses
        </h2>
        <Chip variant="flat" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
          {responses.length} Submissions
        </Chip>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">Submission Time</th>
                <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">Respondent</th>
                {questions.map(q => (
                  <th key={q.questionId} className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 min-w-[200px]">
                    {q.questionText}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {responses.map(resp => (
                <tr key={resp.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-5 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                    {new Date(resp.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isAnonymous ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                        {isAnonymous ? '?' : (resp.userDisplayName || resp.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-bold ${isAnonymous ? 'text-slate-400 italic font-medium' : 'text-slate-900 dark:text-white'}`}>
                        {resp.userDisplayName || resp.username || (isAnonymous ? 'Anonymous' : 'Unknown')}
                      </span>
                    </div>
                  </td>
                  {questions.map(q => (
                    <td key={q.questionId} className="px-6 py-5 text-sm font-medium">
                      <div className="max-w-[400px] break-words">
                        {resp.answers[q.questionId] || <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </section>
  );
}
