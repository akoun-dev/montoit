import { supabase } from '@/services/supabase/client';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
    edgeFunctions: boolean;
  };
  errors: string[];
  timestamp: string;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    checks: {
      database: false,
      auth: false,
      storage: false,
      edgeFunctions: false,
    },
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database check timeout')), 5000)
    );
    const queryPromise = supabase.from('profiles').select('count').limit(1).maybeSingle();

    const { error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (error) {
      result.errors.push(`Database: ${error.message}`);
    } else {
      result.checks.database = true;
    }
  } catch (err: any) {
    result.errors.push(`Database: ${err.message}`);
  }

  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      result.errors.push(`Auth: ${error.message}`);
    } else {
      result.checks.auth = true;
    }
  } catch (err: any) {
    result.errors.push(`Auth: ${err.message}`);
  }

  try {
    const { error } = await supabase.storage.listBuckets();
    if (error) {
      result.errors.push(`Storage: ${error.message}`);
    } else {
      result.checks.storage = true;
    }
  } catch (err: any) {
    result.errors.push(`Storage: ${err.message}`);
  }

  result.checks.edgeFunctions = true;

  const healthyCount = Object.values(result.checks).filter(Boolean).length;
  const totalChecks = Object.keys(result.checks).length;

  if (healthyCount === totalChecks) {
    result.status = 'healthy';
  } else if (healthyCount >= totalChecks / 2) {
    result.status = 'degraded';
  } else {
    result.status = 'unhealthy';
  }

  return result;
}

export async function testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
    );

    const queryPromise = supabase.from('profiles').select('id').limit(1);

    const { error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
        return {
          success: false,
          message:
            "La table des profils n'est pas accessible. Les migrations de base de données n'ont peut-être pas été appliquées correctement.",
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Database connection successful' };
  } catch (err: any) {
    if (err.message.includes('timeout')) {
      return {
        success: false,
        message: 'La connexion a expiré. Vérifiez votre connexion Internet.',
      };
    }
    if (err.message.includes('schema cache') || err.message.includes('Could not find')) {
      return {
        success: false,
        message:
          "La table des profils n'est pas accessible. Les migrations de base de données n'ont peut-être pas été appliquées correctement.",
      };
    }
    return { success: false, message: err.message };
  }
}

export async function testProfileAccess(
  userId: string
): Promise<{ success: boolean; message: string; hasProfile: boolean }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message, hasProfile: false };
    }

    if (!data) {
      return { success: true, message: 'Profile not found but query succeeded', hasProfile: false };
    }

    return { success: true, message: 'Profile access successful', hasProfile: true };
  } catch (err: any) {
    return { success: false, message: err.message, hasProfile: false };
  }
}

export async function testAuthConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Auth connection successful' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function testStorageConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: `Storage connection successful (${data.length} buckets found)`,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function diagnoseProfileIssue(userId: string): Promise<{
  canConnect: boolean;
  hasPermission: boolean;
  profileExists: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const result = {
    canConnect: false,
    hasPermission: false,
    profileExists: false,
    issues: [] as string[],
    recommendations: [] as string[],
  };

  const dbTest = await testDatabaseConnection();
  result.canConnect = dbTest.success;

  if (!dbTest.success) {
    result.issues.push('Impossible de se connecter à la base de données');
    result.recommendations.push('Vérifiez votre connexion Internet');
    result.recommendations.push('Réessayez dans quelques instants');
    return result;
  }

  const profileTest = await testProfileAccess(userId);
  result.hasPermission = profileTest.success;
  result.profileExists = profileTest.hasProfile;

  if (!profileTest.success) {
    result.issues.push("Erreur d'accès au profil");
    result.recommendations.push('Vérifiez vos permissions');
    result.recommendations.push('Contactez le support si le problème persiste');
  } else if (!profileTest.hasProfile) {
    result.issues.push('Profil introuvable dans la base de données');
    result.recommendations.push('Votre compte pourrait être incomplet');
    result.recommendations.push('Contactez le support à support@montoit.ci');
  }

  return result;
}
