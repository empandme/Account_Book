<script lang="ts">
  let { value, onChange }: { value: string; onChange: (iso: string) => void } = $props();
  function toLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocal(local: string): string {
    return new Date(local).toISOString();
  }
</script>

<input
  type="datetime-local"
  value={toLocal(value)}
  oninput={(e) => onChange(fromLocal((e.target as HTMLInputElement).value))}
/>

<style>
  input {
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--fg);
    font-size: 13px;
  }
</style>
