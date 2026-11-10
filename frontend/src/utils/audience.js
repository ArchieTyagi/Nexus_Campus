// Helpers for the "Who is it for?" fields
export function audienceReady(form) {
  return (form.audience !== 'department' || form.department) && (form.audience !== 'batch' || form.batch)
}

export function audienceBody(form) {
  const body = { audience: form.audience }
  if (form.audience === 'department') body.department = form.department
  if (form.audience === 'batch') body.batch = form.batch
  return body
}
