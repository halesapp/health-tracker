import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { showToast, clearCachedHeight } from '../lib/utils.js'

export default function Settings() {
  const [section, setSection] = useState('medications')
  const [meds, setMeds] = useState([])
  const [medTypes, setMedTypes] = useState([])
  const [exerciseTypes, setExerciseTypes] = useState([])
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('5')

  // Add-form state
  const [newMedName, setNewMedName] = useState('')
  const [newMedDose, setNewMedDose] = useState('')
  const [newMedUnit, setNewMedUnit] = useState('mg')
  const [newMedType, setNewMedType] = useState('')
  const [newMedTypeName, setNewMedTypeName] = useState('')
  const [newExName, setNewExName] = useState('')
  const [newExUnit, setNewExUnit] = useState('reps')

  // Inline edit state
  const [editingMed, setEditingMed] = useState(null)
  const [editMedName, setEditMedName] = useState('')
  const [editMedDose, setEditMedDose] = useState('')
  const [editMedUnit, setEditMedUnit] = useState('')
  const [editMedType, setEditMedType] = useState('')

  const [editingMedType, setEditingMedType] = useState(null)
  const [editMedTypeName, setEditMedTypeName] = useState('')

  const [editingEx, setEditingEx] = useState(null)
  const [editExName, setEditExName] = useState('')
  const [editExUnit, setEditExUnit] = useState('')

  useEffect(() => {
    async function load() {
      const [medsRes, mtRes, etRes, profRes] = await Promise.all([
        supabase.from('medications').select('*, medication_types(name)').order('drug_name'),
        supabase.from('medication_types').select('*').order('name'),
        supabase.from('exercise_types').select('*').order('name'),
        supabase.from('user_profile').select('*').limit(1).maybeSingle(),
      ])
      setMeds(medsRes.data || [])
      setMedTypes(mtRes.data || [])
      setExerciseTypes(etRes.data || [])
      if (profRes.data) {
        const total = profRes.data.height_inches || 65
        setHeightFt(String(Math.floor(total / 12)))
        setHeightIn(String(total % 12))
      }
    }
    load()
  }, [])

  // --- Medications ---
  async function addMed(e) {
    e.preventDefault()
    const row = { drug_name: newMedName.trim(), dose: parseFloat(newMedDose), dose_unit: newMedUnit }
    if (newMedType) row.medication_type_id = parseInt(newMedType)
    const { data, error } = await supabase.from('medications').insert(row).select('*, medication_types(name)').single()
    if (error) return showToast(error.message, 'error')
    setMeds([...meds, data].sort((a, b) => a.drug_name.localeCompare(b.drug_name)))
    setNewMedName('')
    setNewMedDose('')
    showToast('Medication added')
  }

  function startMedEdit(m) {
    setEditingMed(m.id)
    setEditMedName(m.drug_name)
    setEditMedDose(String(m.dose))
    setEditMedUnit(m.dose_unit)
    setEditMedType(m.medication_type_id ? String(m.medication_type_id) : '')
  }

  async function saveMedEdit(id) {
    const row = { drug_name: editMedName.trim(), dose: parseFloat(editMedDose), dose_unit: editMedUnit, medication_type_id: editMedType ? parseInt(editMedType) : null }
    const { data, error } = await supabase.from('medications').update(row).eq('id', id).select('*, medication_types(name)').single()
    if (error) return showToast(error.message, 'error')
    setMeds(meds.map(m => m.id === id ? data : m))
    setEditingMed(null)
    showToast('Updated')
  }

  async function deleteMed(id) {
    if (!confirm('Delete this medication?')) return
    const { error } = await supabase.from('medications').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setMeds(meds.filter(m => m.id !== id))
    showToast('Deleted')
  }

  // --- Medication Types ---
  async function addMedType(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('medication_types').insert({ name: newMedTypeName.trim() }).select().single()
    if (error) return showToast(error.message, 'error')
    setMedTypes([...medTypes, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewMedTypeName('')
    showToast('Type added')
  }

  function startMedTypeEdit(t) {
    setEditingMedType(t.id)
    setEditMedTypeName(t.name)
  }

  async function saveMedTypeEdit(id) {
    const { data, error } = await supabase.from('medication_types').update({ name: editMedTypeName.trim() }).eq('id', id).select().single()
    if (error) return showToast(error.message, 'error')
    setMedTypes(medTypes.map(t => t.id === id ? data : t))
    setEditingMedType(null)
    showToast('Updated')
  }

  async function deleteMedType(id) {
    if (!confirm('Delete this type?')) return
    const { error } = await supabase.from('medication_types').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setMedTypes(medTypes.filter(t => t.id !== id))
    showToast('Deleted')
  }

  // --- Exercise Types ---
  async function addExType(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('exercise_types').insert({ name: newExName.trim(), default_unit: newExUnit }).select().single()
    if (error) return showToast(error.message, 'error')
    setExerciseTypes([...exerciseTypes, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewExName('')
    showToast('Exercise type added')
  }

  function startExEdit(t) {
    setEditingEx(t.id)
    setEditExName(t.name)
    setEditExUnit(t.default_unit)
  }

  async function saveExEdit(id) {
    const { data, error } = await supabase.from('exercise_types').update({ name: editExName.trim(), default_unit: editExUnit }).eq('id', id).select().single()
    if (error) return showToast(error.message, 'error')
    setExerciseTypes(exerciseTypes.map(t => t.id === id ? data : t))
    setEditingEx(null)
    showToast('Updated')
  }

  async function deleteExType(id) {
    if (!confirm('Delete this exercise type?')) return
    const { error } = await supabase.from('exercise_types').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setExerciseTypes(exerciseTypes.filter(t => t.id !== id))
    showToast('Deleted')
  }

  // --- Profile ---
  async function saveHeight(e) {
    e.preventDefault()
    const totalInches = parseInt(heightFt) * 12 + parseInt(heightIn)
    const { error } = await supabase.from('user_profile').upsert({ height_inches: totalInches })
    if (error) return showToast(error.message, 'error')
    clearCachedHeight()
    showToast('Height saved')
  }

  return (
    <div class="page">
      <div class="page-header"><h1>Settings</h1></div>

      <div class="section-toggle">
        <button class={section === 'medications' ? 'active' : ''} onClick={() => setSection('medications')}>Meds</button>
        <button class={section === 'medtypes' ? 'active' : ''} onClick={() => setSection('medtypes')}>Med Types</button>
        <button class={section === 'exercises' ? 'active' : ''} onClick={() => setSection('exercises')}>Exercises</button>
        <button class={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}>Profile</button>
      </div>

      {section === 'medications' && (
        <div class="card">
          <h2>Medications</h2>
          <form onSubmit={addMed} class="form-stack">
            <div class="form-row">
              <div class="field field-half">
                <label>Drug Name</label>
                <input type="text" value={newMedName} onInput={e => setNewMedName(e.target.value)} placeholder="Aspirin" required />
              </div>
              <div class="field field-half">
                <label>Dose</label>
                <input type="number" inputmode="decimal" step="any" value={newMedDose} onInput={e => setNewMedDose(e.target.value)} placeholder="100" required />
              </div>
            </div>
            <div class="form-row">
              <div class="field field-half">
                <label>Unit</label>
                <select value={newMedUnit} onChange={e => setNewMedUnit(e.target.value)}>
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="IU">IU</option>
                </select>
              </div>
              <div class="field field-half">
                <label>Type (optional)</label>
                <select value={newMedType} onChange={e => setNewMedType(e.target.value)}>
                  <option value="">None</option>
                  {medTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Medication</button>
          </form>

          <div class="table-scroll" style="margin-top:16px">
            <table>
              <thead><tr><th>Name</th><th>Dose</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {meds.map(m => editingMed === m.id ? (
                  <tr key={m.id}>
                    <td><input type="text" value={editMedName} onInput={e => setEditMedName(e.target.value)} /></td>
                    <td>
                      <input type="number" inputmode="decimal" step="any" value={editMedDose} onInput={e => setEditMedDose(e.target.value)} style="width:60px;display:inline" />
                      <select value={editMedUnit} onChange={e => setEditMedUnit(e.target.value)} style="width:60px;display:inline;margin-left:4px">
                        <option value="mg">mg</option>
                        <option value="mcg">mcg</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="IU">IU</option>
                      </select>
                    </td>
                    <td>
                      <select value={editMedType} onChange={e => setEditMedType(e.target.value)}>
                        <option value="">None</option>
                        {medTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Save" onClick={() => saveMedEdit(m.id)}>{'\u2714'}</button>
                      <button class="btn-icon" title="Cancel" onClick={() => setEditingMed(null)}>{'\u2716'}</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id}>
                    <td>{m.drug_name}</td>
                    <td>{m.dose}{m.dose_unit}</td>
                    <td>{m.medication_types?.name || '--'}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Edit" onClick={() => startMedEdit(m)}>{'\u270E'}</button>
                      <button class="btn-icon" title="Delete" onClick={() => deleteMed(m.id)}>{'\uD83D\uDDD1'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meds.length === 0 && <p class="empty">No medications configured</p>}
        </div>
      )}

      {section === 'medtypes' && (
        <div class="card">
          <h2>Medication Types</h2>
          <form onSubmit={addMedType} class="form-stack">
            <div class="form-row">
              <div class="field" style="flex:1">
                <label>Type Name</label>
                <input type="text" value={newMedTypeName} onInput={e => setNewMedTypeName(e.target.value)} placeholder="Supplement" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Type</button>
          </form>

          <div class="table-scroll" style="margin-top:16px">
            <table>
              <thead><tr><th>Name</th><th></th></tr></thead>
              <tbody>
                {medTypes.map(t => (
                  <tr key={t.id}>
                    <td>
                      {editingMedType === t.id ? (
                        <input type="text" value={editMedTypeName} onInput={e => setEditMedTypeName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveMedTypeEdit(t.id); if (e.key === 'Escape') setEditingMedType(null) }} autofocus />
                      ) : (
                        <span class="editable-text" onClick={() => startMedTypeEdit(t)}>{t.name}</span>
                      )}
                    </td>
                    <td class="td-actions">
                      {editingMedType === t.id ? (
                        <>
                          <button class="btn-icon" title="Save" onClick={() => saveMedTypeEdit(t.id)}>{'\u2714'}</button>
                          <button class="btn-icon" title="Cancel" onClick={() => setEditingMedType(null)}>{'\u2716'}</button>
                        </>
                      ) : (
                        <button class="btn-icon" title="Delete" onClick={() => deleteMedType(t.id)}>{'\uD83D\uDDD1'}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {medTypes.length === 0 && <p class="empty">No medication types</p>}
        </div>
      )}

      {section === 'exercises' && (
        <div class="card">
          <h2>Exercise Types</h2>
          <form onSubmit={addExType} class="form-stack">
            <div class="form-row">
              <div class="field field-half">
                <label>Name</label>
                <input type="text" value={newExName} onInput={e => setNewExName(e.target.value)} placeholder="Push-ups" required />
              </div>
              <div class="field field-half">
                <label>Default Unit</label>
                <select value={newExUnit} onChange={e => setNewExUnit(e.target.value)}>
                  <option value="reps">reps</option>
                  <option value="seconds">seconds</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Exercise Type</button>
          </form>

          <div class="table-scroll" style="margin-top:16px">
            <table>
              <thead><tr><th>Name</th><th>Unit</th><th></th></tr></thead>
              <tbody>
                {exerciseTypes.map(t => (
                  <tr key={t.id}>
                    <td>
                      {editingEx === t.id ? (
                        <input type="text" value={editExName} onInput={e => setEditExName(e.target.value)} autofocus />
                      ) : (
                        <span class="editable-text" onClick={() => startExEdit(t)}>{t.name}</span>
                      )}
                    </td>
                    <td>
                      {editingEx === t.id ? (
                        <select value={editExUnit} onChange={e => setEditExUnit(e.target.value)}>
                          <option value="reps">reps</option>
                          <option value="seconds">seconds</option>
                        </select>
                      ) : (
                        t.default_unit
                      )}
                    </td>
                    <td class="td-actions">
                      {editingEx === t.id ? (
                        <>
                          <button class="btn-icon" title="Save" onClick={() => saveExEdit(t.id)}>{'\u2714'}</button>
                          <button class="btn-icon" title="Cancel" onClick={() => setEditingEx(null)}>{'\u2716'}</button>
                        </>
                      ) : (
                        <button class="btn-icon" title="Delete" onClick={() => deleteExType(t.id)}>{'\uD83D\uDDD1'}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {exerciseTypes.length === 0 && <p class="empty">No exercise types</p>}
        </div>
      )}

      {section === 'profile' && (
        <div class="card">
          <h2>Profile</h2>
          <form onSubmit={saveHeight} class="form-stack">
            <div class="form-row">
              <div class="field field-half">
                <label>Height (feet)</label>
                <input type="number" inputmode="numeric" min="3" max="8" value={heightFt} onInput={e => setHeightFt(e.target.value)} required />
              </div>
              <div class="field field-half">
                <label>Height (inches)</label>
                <input type="number" inputmode="numeric" min="0" max="11" value={heightIn} onInput={e => setHeightIn(e.target.value)} required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Height</button>
          </form>
        </div>
      )}
    </div>
  )
}
