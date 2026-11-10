// "Who is it for?" fields, shared by the posting forms.
// form needs audience, department and batch. set(key) returns an onChange handler.
export default function AudienceFields({ form, set, departments, batches }) {
  const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
  return (
    <>
      <label className="field">
        Who is it for?
        <select value={form.audience} onChange={set('audience')}>
          <option value="all">Whole college</option>
          <option value="department">One department</option>
          <option value="batch">One batch</option>
        </select>
      </label>
      {form.audience === 'department' && (
        <label className="field">
          Department
          <select value={form.department} onChange={set('department')} required>
            <option value="">Pick a department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {form.audience === 'batch' && (
        <label className="field">
          Batch
          <select value={form.batch} onChange={set('batch')} required>
            <option value="">Pick a batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {batchLabel(b)}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
