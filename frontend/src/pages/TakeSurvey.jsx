import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardBody, Divider } from "@heroui/react";
import RadioQuestion from '../components/questions/RadioQuestion';
import TrueFalseQuestion from '../components/questions/TrueFalseQuestion';
import RankingQuestion from '../components/questions/RankingQuestion';
import SurveyActions from '../components/SurveyActions';

export default function TakeSurvey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSurvey(null);
    setAnswers({});

    const run = async () => {
      try {
        const response = await axios.get(`/api/surveys/${id}`);
        if (!cancelled) {
          const { survey: s, questions } = response.data;
          setSurvey({ ...s, questions: questions || [] });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load survey');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleOptionChange = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async () => {
    setError('');

    // Check if all required questions are answered
    const unanswered = survey.questions.filter(q => q.isRequired && !answers[q.id]);
    if (unanswered.length > 0) {
      setError('Please answer all required questions');
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        questionId: parseInt(qId, 10),
        selectedOption: val
      }));

      await axios.post(`/api/surveys/${id}/responses`, { answers: formattedAnswers });
      navigate('/browse', { state: { message: 'Response submitted successfully!' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading survey...</div>;
  if (error && !survey) return <div className="p-8 text-danger">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card isBlurred className="border-none bg-background/60 dark:bg-default-100/50 shadow-lg">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold uppercase">{survey.title}</h1>
          <p className="text-default-500">{survey.description || 'Please complete the survey below.'}</p>
          {error && <p className="text-danger mt-2">{error}</p>}
        </CardHeader>
        <Divider className="my-4" />
        <CardBody className="px-6 pb-6">
          <form onSubmit={(e) => e.preventDefault()}>
            {survey.questions.map((q, index) => {
              const type = q.type || 'multipleChoice';
              if (type === 'trueFalse') {
                return (
                  <TrueFalseQuestion
                    key={q.id}
                    question={q}
                    index={index}
                    value={answers[q.id]}
                    onChange={(val) => handleOptionChange(q.id, val)}
                  />
                );
              }
              if (type === 'ranking') {
                return (
                  <RankingQuestion
                    key={q.id}
                    question={q}
                    index={index}
                    value={answers[q.id]}
                    onChange={(val) => handleOptionChange(q.id, val)}
                  />
                );
              }
              return (
                <RadioQuestion
                  key={q.id}
                  question={q}
                  index={index}
                  value={answers[q.id]}
                  onChange={(val) => handleOptionChange(q.id, val)}
                />
              );
            })}

            <SurveyActions
              onSubmit={handleSubmit}
              onCancel={() => navigate('/browse')}
              isSubmitting={submitting}
            />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
