import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { showToast, clearCachedHeight } from '../lib/utils.js'

export default function Settings() {
  const [section, setSection] = useState('ingredients')
  const [ingredients, setIngredients] = useState([])
  const [meds, setMeds] = useState([])
  const [medTypes, setMedTypes] = useState([])
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('5')

  // Ingredient add/edit state
  const [newIngName, setNewIngName] = useState('')
  const [newIngDose, setNewIngDose] = useState('')
  const [newIngUnit, setNewIngUnit] = useState('mg')
  const [editingIng, setEditingIng] = useState(null)
  const [editIngName, setEditIngName] = useState('')
  const [editIngDose, setEditIngDose] = useState('')
  const [editIngUnit, setEditIngUnit] = useState('')

  // Medication add/edit state
  const [newBrandName, setNewBrandName] = useState('')
  const [newMedType, setNewMedType] = useState('')
  const [newIngIds, setNewIngIds] = useState([''])
  const [editingMed, setEditingMed] = useState(null)
  const [editBrandName, setEditBrandName] = useState('')
  const [editMedType, setEditMedType] = useState('')
  const [editIngIds, setEditIngIds] = useState([''])

  // Medication type state
  const [newMedTypeName, setNewMedTypeName] = useState('')
  const [editingMedType, setEditingMedType] = useState(null)
  const [editMedTypeName, setEditMedTypeName] = useState('')

  useEffect(() => {
    async function load() {
      const [ingRes, medsRes, mtRes, profRes] = await Promise.all([
        supabase.from('health_active_ingredients').select('*').order('ingredient_name'),
        supabase.from('health_medications').select('*, health_medication_types(name), health_medication_ingredients(ingredient_id)').order('brand_name'),
        supabase.from('health_medication_types').select('*').order('name'),
        supabase.from('health_user_profile').select('*').limit(1).maybeSingle(),
      ])
      setIngredients(ingRes.data || [])
      setMeds(medsRes.data || [])
      setMedTypes(mtRes.data || [])
      if (profRes.data) {
        const total = profRes.data.height_inches || 65
        setHeightFt(String(Math.floor(total / 12)))
        setHeightIn(String(total % 12))
      }
    }
    load()
  }, [])

  function ingredientLabel(i) {
    return `${i.ingredient_name} ${i.dose}${i.dose_unit}`
  }

  // --- Active Ingredients ---
  async function addIngredient(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('health_active_ingredients').insert({
      ingredient_name: newIngName.trim(), dose: parseFloat(newIngDose), dose_unit: newIngUnit,
    }).select().single()
    if (error) return showToast(error.message, 'error')
    setIngredients([...ingredients, data].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name)))
    setNewIngName('')
    setNewIngDose('')
    showToast('Ingredient added')
  }

  function startIngEdit(i) {
    setEditingIng(i.id)
    setEditIngName(i.ingredient_name)
    setEditIngDose(String(i.dose))
    setEditIngUnit(i.dose_unit)
  }

  async function saveIngEdit(id) {
    const { data, error } = await supabase.from('health_active_ingredients').update({
      ingredient_name: editIngName.trim(), dose: parseFloat(editIngDose), dose_unit: editIngUnit,
    }).eq('id', id).select().single()
    if (error) return showToast(error.message, 'error')
    setIngredients(ingredients.map(i => i.id === id ? data : i))
    setEditingIng(null)
    showToast('Updated')
  }

  async function deleteIngredient(id) {
    if (!confirm('Delete this ingredient? It will be removed from any health_medications using it.')) return
    const { error } = await supabase.from('health_active_ingredients').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setIngredients(ingredients.filter(i => i.id !== id))
    showToast('Deleted')
  }

  // --- Medications ---
  async function addMed(e) {
    e.preventDefault()
    const selectedIds = newIngIds.filter(id => id)
    if (selectedIds.length === 0) return showToast('Select at least one ingredient', 'error')
    const row = { brand_name: newBrandName.trim() }
    if (newMedType) row.type_id = parseInt(newMedType)
    const { data: med, error } = await supabase.from('health_medications').insert(row).select('*, health_medication_types(name)').single()
    if (error) return showToast(error.message, 'error')
    const links = selectedIds.map(ingredient_id => ({ medication_id: med.id, ingredient_id: parseInt(ingredient_id) }))
    const { error: linkErr } = await supabase.from('health_medication_ingredients').insert(links)
    if (linkErr) return showToast(linkErr.message, 'error')
    med.health_medication_ingredients = links.map(l => ({ ingredient_id: l.ingredient_id }))
    setMeds([...meds, med].sort((a, b) => a.brand_name.localeCompare(b.brand_name)))
    setNewBrandName('')
    setNewMedType('')
    setNewIngIds([''])
    showToast('Medication added')
  }

  function startMedEdit(m) {
    setEditingMed(m.id)
    setEditBrandName(m.brand_name)
    setEditMedType(m.type_id ? String(m.type_id) : '')
    const ids = (m.health_medication_ingredients || []).map(i => String(i.ingredient_id))
    setEditIngIds(ids.length ? ids : [''])
  }

  async function saveMedEdit(id) {
    const selectedIds = editIngIds.filter(id => id)
    if (selectedIds.length === 0) return showToast('Select at least one ingredient', 'error')
    const { error } = await supabase.from('health_medications').update({
      brand_name: editBrandName.trim(), type_id: editMedType ? parseInt(editMedType) : null,
    }).eq('id', id)
    if (error) return showToast(error.message, 'error')
    await supabase.from('health_medication_ingredients').delete().eq('medication_id', id)
    const links = selectedIds.map(ingredient_id => ({ medication_id: id, ingredient_id: parseInt(ingredient_id) }))
    const { error: linkErr } = await supabase.from('health_medication_ingredients').insert(links)
    if (linkErr) return showToast(linkErr.message, 'error')
    const { data: updated } = await supabase.from('health_medications').select('*, health_medication_types(name), health_medication_ingredients(ingredient_id)').eq('id', id).single()
    setMeds(meds.map(m => m.id === id ? updated : m))
    setEditingMed(null)
    showToast('Updated')
  }

  async function deleteMed(id) {
    if (!confirm('Delete this medication?')) return
    const { error } = await supabase.from('health_medications').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setMeds(meds.filter(m => m.id !== id))
    showToast('Deleted')
  }

  function ingredientNamesForMed(m) {
    const ids = (m.health_medication_ingredients || []).map(i => i.ingredient_id)
    return ingredients.filter(i => ids.includes(i.id)).map(ingredientLabel).join(', ')
  }

  function IngredientSelectRows({ ids, setIds }) {
    if (ingredients.length === 0) return <p class="empty">No ingredients configured. Add ingredients first.</p>
    return (
      <>
        {ids.map((selectedId, idx) => (
          <div class="form-row" key={idx}>
            <div class="field" style="flex:1">
              <select value={selectedId} onChange={e => setIds(ids.map((v, i) => i === idx ? e.target.value : v))}>
                <option value="">Select ingredient...</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{ingredientLabel(i)}</option>)}
              </select>
            </div>
            {ids.length > 1 && (
              <button type="button" class="btn-icon" title="Remove" onClick={() => setIds(ids.filter((_, i) => i !== idx))}>{'\u2716'}</button>
            )}
          </div>
        ))}
        <button type="button" class="btn btn-secondary" style="align-self:flex-start;margin-top:4px" onClick={() => setIds([...ids, ''])}>+ Add Ingredient</button>
      </>
    )
  }

  // --- Medication Types ---
  async function addMedType(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('health_medication_types').insert({ name: newMedTypeName.trim() }).select().single()
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
    const { data, error } = await supabase.from('health_medication_types').update({ name: editMedTypeName.trim() }).eq('id', id).select().single()
    if (error) return showToast(error.message, 'error')
    setMedTypes(medTypes.map(t => t.id === id ? data : t))
    setEditingMedType(null)
    showToast('Updated')
  }

  async function deleteMedType(id) {
    if (!confirm('Delete this type?')) return
    const { error } = await supabase.from('health_medication_types').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setMedTypes(medTypes.filter(t => t.id !== id))
    showToast('Deleted')
  }

  // --- Profile ---
  async function saveHeight(e) {
    e.preventDefault()
    const totalInches = parseInt(heightFt) * 12 + parseInt(heightIn)
    const { error } = await supabase.from('health_user_profile').upsert({ height_inches: totalInches })
    if (error) return showToast(error.message, 'error')
    clearCachedHeight()
    showToast('Height saved')
  }

  return (
    <div class="page">
      <div class="page-header"><h1>Settings</h1></div>

      <div class="section-toggle">
        <button class={section === 'ingredients' ? 'active' : ''} onClick={() => setSection('ingredients')}>Ingredients</button>
        <button class={section === 'health_medications' ? 'active' : ''} onClick={() => setSection('health_medications')}>Meds</button>
        <button class={section === 'medtypes' ? 'active' : ''} onClick={() => setSection('medtypes')}>Med Types</button>
        <button class={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}>Profile</button>
      </div>

      {section === 'ingredients' && (
        <div class="card">
          <h2>Active Ingredients</h2>
          <form onSubmit={addIngredient} class="form-stack">
            <div class="form-row">
              <div class="field" style="flex:2">
                <label>Name</label>
                <input type="text" value={newIngName} onInput={e => setNewIngName(e.target.value)} placeholder="ibuprofen" required />
              </div>
              <div class="field" style="flex:1">
                <label>Dose</label>
                <input type="number" inputmode="decimal" step="any" value={newIngDose} onInput={e => setNewIngDose(e.target.value)} placeholder="200" required />
              </div>
              <div class="field" style="flex:1">
                <label>Unit</label>
                <select value={newIngUnit} onChange={e => setNewIngUnit(e.target.value)}>
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="IU">IU</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Ingredient</button>
          </form>

          <div class="table-scroll" style="margin-top:16px">
            <table>
              <thead><tr><th>Name</th><th>Dose</th><th></th></tr></thead>
              <tbody>
                {ingredients.map(i => editingIng === i.id ? (
                  <tr key={i.id}>
                    <td><input type="text" value={editIngName} onInput={e => setEditIngName(e.target.value)} /></td>
                    <td>
                      <input type="number" inputmode="decimal" step="any" value={editIngDose} onInput={e => setEditIngDose(e.target.value)} style="width:60px;display:inline" />
                      <select value={editIngUnit} onChange={e => setEditIngUnit(e.target.value)} style="width:60px;display:inline;margin-left:4px">
                        <option value="mg">mg</option>
                        <option value="mcg">mcg</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="IU">IU</option>
                      </select>
                    </td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Save" onClick={() => saveIngEdit(i.id)}>{'\u2714'}</button>
                      <button class="btn-icon" title="Cancel" onClick={() => setEditingIng(null)}>{'\u2716'}</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={i.id}>
                    <td>{i.ingredient_name}</td>
                    <td>{i.dose}{i.dose_unit}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Edit" onClick={() => startIngEdit(i)}>{'\u270E'}</button>
                      <button class="btn-icon" title="Delete" onClick={() => deleteIngredient(i.id)}>{'\uD83D\uDDD1'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ingredients.length === 0 && <p class="empty">No ingredients configured</p>}
        </div>
      )}

      {section === 'health_medications' && (
        <div class="card">
          <h2>Medications</h2>
          <form onSubmit={addMed} class="form-stack">
            <div class="form-row">
              <div class="field field-half">
                <label>Brand Name</label>
                <input type="text" value={newBrandName} onInput={e => setNewBrandName(e.target.value)} placeholder="Advil" required />
              </div>
              <div class="field field-half">
                <label>Type (optional)</label>
                <select value={newMedType} onChange={e => setNewMedType(e.target.value)}>
                  <option value="">None</option>
                  {medTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <label style="margin-top:8px;font-weight:600">Active Ingredients</label>
            <IngredientSelectRows ids={newIngIds} setIds={setNewIngIds} />
            <button type="submit" class="btn btn-primary btn-block">Add Medication</button>
          </form>

          <div class="table-scroll" style="margin-top:16px">
            <table>
              <thead><tr><th>Brand</th><th>Ingredients</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {meds.map(m => editingMed === m.id ? (
                  <tr key={m.id}>
                    <td><input type="text" value={editBrandName} onInput={e => setEditBrandName(e.target.value)} /></td>
                    <td>
                      <IngredientSelectRows ids={editIngIds} setIds={setEditIngIds} />
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
                    <td>{m.brand_name}</td>
                    <td>{ingredientNamesForMed(m)}</td>
                    <td>{m.health_medication_types?.name || '--'}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Edit" onClick={() => startMedEdit(m)}>{'\u270E'}</button>
                      <button class="btn-icon" title="Delete" onClick={() => deleteMed(m.id)}>{'\uD83D\uDDD1'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meds.length === 0 && <p class="empty">No health_medications configured</p>}
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
