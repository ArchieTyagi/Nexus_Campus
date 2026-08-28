import { useEffect } from 'react'

// "Who is it for?" fields, shared by the posting forms.
// form needs audience, department and batch. set(key) returns an onChange handler.
// batchOnly: batch managers can only post to one of their batches, so only the batch picker shows.
// departmentOnly: HODs post to their own department or one of its batches, never the whole college.
export default function AudienceFields({ form, set, departments, batches, batchOnly = false, departmentOnly = false }) {
  // An HOD has one department, so it is filled in for them
  const onlyDept = departmentOnly && departments.length === 1 ? departments[0]._id : ''
  useEffect(() => {
    if (onlyDept && form.department !== onlyDept) set('department')({ target: { value: onlyDept } })
  }, [onlyDept, form.department, set])

  const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
  const batchPicker = (
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
  )

  if (batchOnly) return batchPicker

  return (
    <>
      <label className="field">
        Who is it for?
        <select value={form.audience} onChange={set('audience')}>
          {!departmentOnly && <option value="all">Whole college</option>}
          <option value="department">{departmentOnly ? 'My department' : 'One department'}</option>
          <option value="batch">One batch</option>
        </select>
      </label>
      {form.audience === 'department' && !onlyDept && (
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
      {form.audience === 'batch' && batchPicker}
    </>
  )
}
