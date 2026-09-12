export function ComponentArt({ kind = 'cpus', large = false }: { kind?: string; large?: boolean }) {
  return (
    <div className={`component-art art-${kind} ${large ? 'art-large' : ''}`} aria-hidden="true">
      <div className="art-grid" />
      <div className="art-axis art-axis-x" />
      <div className="art-axis art-axis-y" />
      <div className="art-object">
        <div className="art-inner">
          <span>{kind === 'gpus' ? 'GRAPHICS' : kind === 'ssds' ? 'NVME' : 'CORE'}</span>
          <b>{kind === 'gpus' ? 'GPU' : kind === 'ssds' ? 'SSD' : 'CPU'}</b>
        </div>
      </div>
      <span className="art-coordinate">
        {kind === 'gpus' ? 'PCIe 16×' : kind === 'ssds' ? 'M.2 2280' : 'SOCKET / 01'}
      </span>
    </div>
  );
}
