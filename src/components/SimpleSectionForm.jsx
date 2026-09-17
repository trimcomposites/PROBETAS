import { getFieldLabel } from '../utils/labels'

function SimpleSectionForm({ fields, renderFieldControl, fieldErrors = {} }) {
  return fields.map((field) => (
    <label
      key={field.name}
      className={`form-field ${fieldErrors[field.name] ? 'has-field-error' : ''}`}
    >
      <span className="field-label">
        {getFieldLabel(field.name)}{field.required ? ' *' : ''}
      </span>
      {renderFieldControl(field)}
    </label>
  ))
}

export default SimpleSectionForm
