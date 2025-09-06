import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard({ userId }) {
  const supabase = useSupabaseClient();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .order('usage_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Usage Analytics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={analytics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="usage_date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="prompts_used" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}