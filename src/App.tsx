import { SupabaseProvider } from '@/context/supabase.context';
import { supabaseClient } from '@/db/supabase.client';

export function App() {
  return (
    <SupabaseProvider client={supabaseClient}>
      <div>Welcome to Kidosy</div>
    </SupabaseProvider>
  );
}

export default App;
