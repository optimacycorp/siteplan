const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";

export const hasRegridProxyEnv = Boolean(supabaseUrl);

export const regridConfig = {
  proxyBaseUrl: supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/regrid-proxy` : "",
};

export function assertRegridConfigured() {
  if (!hasRegridProxyEnv || !regridConfig.proxyBaseUrl) {
    throw new Error("Regrid proxy is not configured. Set VITE_SUPABASE_URL and deploy the regrid-proxy function.");
  }
}
