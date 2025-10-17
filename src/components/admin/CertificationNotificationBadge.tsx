import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

const CertificationNotificationBadge = () => {
  const [count, setCount] = useState(0);

  const fetchPendingCount = async () => {
    const { count: pendingCount, error } = await supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('certification_status', 'pending');

    if (!error && pendingCount !== null) {
      setCount(pendingCount);
    }
  };

  useEffect(() => {
    fetchPendingCount();

    // Real-time subscription
    const channel = supabase
      .channel('certification-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
          filter: 'certification_status=eq.pending'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (count === 0) return null;

  return (
    <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs">
      {count}
    </Badge>
  );
};

export default CertificationNotificationBadge;
