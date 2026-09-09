import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import AppHeader from './components/AppHeader'
import ArchivedRecordsToggle from './components/ArchivedRecordsToggle'
import AuthScreen from './components/AuthScreen'
import BrandWordmark from './components/BrandWordmark'
import FormModal from './components/FormModal'
import PasswordRecoveryScreen from './components/PasswordRecoveryScreen'
import PdfDropzone from './components/PdfDropzone'
import ProbetaForm from './components/ProbetaForm'
import ProbetaRecordsTable from './components/ProbetaRecordsTable'
import RecordActionConfirmation from './components/RecordActionConfirmation'
import RecetaForm from './components/RecetaForm'
import SectionSidebar from './components/SectionSidebar'
import SectionTable from './components/SectionTable'
import SimpleRecordsTable from './components/SimpleRecordsTable'
import SimpleSectionForm from './components/SimpleSectionForm'
import SqlConsoleModal from './components/SqlConsoleModal'
import UserManagementModal from './components/UserManagementModal'
import {
  PROBETA_STEPS,
  SECTION_ORDER,
  SIMPLE_SECTION_FIELDS,
  SIMPLE_SECTION_TABLE_FIELDS,
} from './config/appConfig'
import { localDatabase } from './data/probetasSchema'
import {
  deleteProbetaRecord,
  deleteProbetaDraft,
  deleteRecetaRecord,
  deleteSimpleRecord,
  archiveRecord,
  getArchivedReferenceLabels,
  restoreRecord,
  loadDatabaseFromSupabase,
  saveProbetaRecord,
  saveProbetaDraft,
  saveRecetaRecord,
  saveSimpleRecord,
} from './services/databaseService'
import {
  createManagedUser,
  deleteManagedUser,
  getCurrentProfile,
  getCurrentSession,
  listProfiles,
  requestPasswordReset,
  signInWithPassword,
  signOut,
  sendManagedPasswordRecovery,
  subscribeToAuthChanges,
  updateProfileApproval,
  updateProfileRole,
  updateUserPassword,
  userMustChangePassword,
} from './services/authService'
import { getFieldLabel, getTableLabel } from './utils/labels'
import {
  deleteAttachment,
  downloadAttachment,
  getAttachmentMetadata,
  isPdfField,
  listAttachmentMetadata,
  previewAttachment,
  saveAttachment,
} from './utils/fileStorage'
import {
  buildProbetaDraftFromRecord,
  buildProbetaDraftRows,
  buildProbetaRows,
  CURED_THICKNESS_FIELDS,
  buildRecetaDraftFromRecord,
  buildRecetaRows,
  createBaseRecord,
  createEmptyDraft,
  createEmptyLayer,
  createEmptyRecipeStep,
  formatCellValue,
  UNCURED_THICKNESS_FIELDS,
  getCalculatedDensity,
  getCalculatedThicknessFromMeasurements,
  getInputType,
  getRecordLabel,
  moveItem,
  parseFieldValue,
} from './utils/records'
import { getReferencedTableName, getTable } from './utils/schema'
import { getPermissionSet, normalizeRole, ROLE_LABELS } from './utils/permissions'
import { updateRecipeStep } from './utils/recipeSteps'
import { formatTemperatureInput } from './utils/temperatureUnits'
import { createOperationGate } from './utils/operationGate'
import { getUserError } from './utils/userError'
import { getRecordAction } from './utils/recordArchiving'

function getStoredTheme() {
  try {
    return window.localStorage.getItem('probetas-theme') ?? 'dark'
  } catch {
    return 'dark'
  }
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem('probetas-theme', theme)
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

function getAuthErrorMessage(error, fallbackMessage) {
  return getUserError(error, fallbackMessage).message
}

function App() {
  const [theme, setTheme] = useState(getStoredTheme)
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authView, setAuthView] = useState('signin')
  const [database, setDatabase] = useState(localDatabase)
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(true)
  const [databaseError, setDatabaseError] = useState('')
  const [recordListMode, setRecordListMode] = useState('active')
  const [selectedTableName, setSelectedTableName] = useState(SECTION_ORDER[0])
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(null)
  const [activeProbetaDraftId, setActiveProbetaDraftId] = useState(null)
  const [draft, setDraft] = useState(() =>
    createEmptyDraft(SECTION_ORDER[0], getTable(SECTION_ORDER[0])),
  )
  const [formMode, setFormMode] = useState(null)
  const [activeProbetaStep, setActiveProbetaStep] = useState(PROBETA_STEPS[0])
  const [activeRecipeStepIndex, setActiveRecipeStepIndex] = useState(0)
  const [isSqlConsoleOpen, setIsSqlConsoleOpen] = useState(false)
  const [isAcabadoModalOpen, setIsAcabadoModalOpen] = useState(false)
  const [acabadoDraft, setAcabadoDraft] = useState(() =>
    createBaseRecord(getTable('ACABADO')),
  )
  const [pendingAcabadoField, setPendingAcabadoField] = useState('acabado_id')
  const [isPreImpregnadoModalOpen, setIsPreImpregnadoModalOpen] = useState(false)
  const [preImpregnadoDraft, setPreImpregnadoDraft] = useState(() =>
    createBaseRecord(getTable('PRE-IMPREGNADO')),
  )
  const [pendingLayerIndex, setPendingLayerIndex] = useState(null)
  const [isRecetaModalOpen, setIsRecetaModalOpen] = useState(false)
  const [recetaDraft, setRecetaDraft] = useState(() => createEmptyDraft('RECETAS', getTable('RECETAS')))
  const [recetaModalStepIndex, setRecetaModalStepIndex] = useState(0)
  const [relatedRecordModal, setRelatedRecordModal] = useState(null)
  const [relatedRecordDraft, setRelatedRecordDraft] = useState(null)
  const [attachmentIndex, setAttachmentIndex] = useState({})
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const [userProfiles, setUserProfiles] = useState([])
  const [isLoadingUserProfiles, setIsLoadingUserProfiles] = useState(false)
  const [userProfilesError, setUserProfilesError] = useState('')
  const [updatingProfileId, setUpdatingProfileId] = useState(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [sendingRecoveryUserId, setSendingRecoveryUserId] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState(() => new Set())
  const [pendingRecordAction, setPendingRecordAction] = useState(null)
  const [archivedReferenceLabels, setArchivedReferenceLabels] = useState({})
  const [formFieldErrors, setFormFieldErrors] = useState({})
  const [recipeTableTemperatureUnit, setRecipeTableTemperatureUnit] = useState('celsius')
  const operationGateRef = useRef(createOperationGate())

  const sectionRecordsRaw = database[selectedTableName] ?? []
  const sectionRecords =
    selectedTableName === 'PROBETA'
      ? [
          ...buildProbetaRows(sectionRecordsRaw, database),
          ...buildProbetaDraftRows(database.PROBETA_BORRADORES ?? []),
        ]
      : selectedTableName === 'RECETAS'
        ? buildRecetaRows(sectionRecordsRaw, database)
      : sectionRecordsRaw
  const probetaAverageThickness = useMemo(
    () =>
      draft.has_uncured_thickness
        ? getCalculatedThicknessFromMeasurements(draft, CURED_THICKNESS_FIELDS)
        : '',
    [draft],
  )
  const probetaAverageThicknessWithoutCuring = useMemo(
    () => getCalculatedThicknessFromMeasurements(draft, UNCURED_THICKNESS_FIELDS),
    [draft],
  )
  const probetaCalculatedDensity = useMemo(() => getCalculatedDensity(draft), [draft])
  const simpleFields = SIMPLE_SECTION_FIELDS[selectedTableName] ?? []
  const simpleTableFields = SIMPLE_SECTION_TABLE_FIELDS[selectedTableName] ?? simpleFields
  const recipeTableFields = simpleTableFields.map((field) =>
    field.name === 'temperatura_final_c'
      ? { name: 'pico_temperatura_c', type: 'float4' }
      : field,
  )
  const currentRole = normalizeRole(currentProfile?.role)
  const permissions = getPermissionSet(currentRole)
  const currentUserRoleLabel = ROLE_LABELS[currentRole]
  const isCurrentUserApproved = Boolean(currentProfile?.is_approved)

  useEffect(() => {
    persistTheme(theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage(null)
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [feedbackMessage])

  function resetWorkspaceState() {
    setDatabase(localDatabase)
    setIsLoadingDatabase(false)
    setDatabaseError('')
    setRecordListMode('active')
    setSelectedTableName(SECTION_ORDER[0])
    setSelectedRecordIndex(null)
    setActiveProbetaDraftId(null)
    setDraft(createEmptyDraft(SECTION_ORDER[0], getTable(SECTION_ORDER[0])))
    setFormMode(null)
    setActiveProbetaStep(PROBETA_STEPS[0])
    setActiveRecipeStepIndex(0)
    setIsSqlConsoleOpen(false)
    setIsAcabadoModalOpen(false)
    setAcabadoDraft(createBaseRecord(getTable('ACABADO')))
    setPendingAcabadoField('acabado_id')
    setIsPreImpregnadoModalOpen(false)
    setPreImpregnadoDraft(createBaseRecord(getTable('PRE-IMPREGNADO')))
    setPendingLayerIndex(null)
    setIsRecetaModalOpen(false)
    setRecetaDraft(createEmptyDraft('RECETAS', getTable('RECETAS')))
    setRecetaModalStepIndex(0)
    setRelatedRecordModal(null)
    setRelatedRecordDraft(null)
    setAttachmentIndex({})
    setFeedbackMessage(null)
    setIsUserManagementOpen(false)
    setUserProfiles([])
    setUserProfilesError('')
    setIsLoadingUserProfiles(false)
    setUpdatingProfileId(null)
    setIsCreatingUser(false)
    setSendingRecoveryUserId(null)
    setDeletingUserId(null)
    setFormFieldErrors({})
    setPendingRecordAction(null)
    setArchivedReferenceLabels({})
  }

  async function refreshDatabase(archiveState = recordListMode) {
    setIsLoadingDatabase(true)
    setDatabaseError('')

    try {
      const nextDatabase = await loadDatabaseFromSupabase({ archiveState })
      setDatabase(nextDatabase)
      return nextDatabase
    } catch (error) {
      setDatabaseError(getUserError(error, 'No se pudo cargar la base de datos.').message)
      return null
    } finally {
      setIsLoadingDatabase(false)
    }
  }

  function showFeedback(kind, message) {
    setFeedbackMessage({ kind, message })
  }

  function clearFormFieldError(fieldName) {
    setFormFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  function showSafeError(error, fallbackMessage, { markField = false } = {}) {
    const userError = getUserError(error, fallbackMessage)

    if (markField) {
      setFormFieldErrors(userError.fieldName ? { [userError.fieldName]: true } : {})
    }

    showFeedback('error', userError.message)
    return userError
  }

  function getRecordActionOperationKey(action, index) {
    const selectedRecord = sectionRecords[index]

    if (selectedRecord?.isDraft) {
      return `${action}-probeta-draft:${selectedRecord.draftId}`
    }

    return `${action}:${selectedTableName}:${sectionRecordsRaw[index]?.id ?? index}`
  }

  function isRecordActionPending(action, index) {
    return pendingDeleteKeys.has(getRecordActionOperationKey(action, index))
  }

  function runExclusiveOperation(key, operation) {
    return operationGateRef.current.run(key, operation)
  }

  async function refreshUserProfiles() {
    if (!permissions.canManageUsers) {
      return []
    }

    setIsLoadingUserProfiles(true)
    setUserProfilesError('')

    try {
      const profiles = await listProfiles()
      setUserProfiles(profiles)
      return profiles
    } catch (error) {
      setUserProfilesError(getUserError(error, 'No se pudo cargar la lista de usuarios.').message)
      return []
    } finally {
      setIsLoadingUserProfiles(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function applySession(nextSession) {
      setSession(nextSession)
      setCurrentUser(nextSession?.user ?? null)
      setAuthError('')

      if (!nextSession?.user) {
        setCurrentProfile(null)
        resetWorkspaceState()
        return
      }

      if (userMustChangePassword(nextSession.user)) {
        setAuthView('reset')
        setAuthNotice('Debes cambiar la contraseña temporal antes de usar la aplicacion.')
        setCurrentProfile(null)
        resetWorkspaceState()
        return
      }

      try {
        const profile = await getCurrentProfile(nextSession.user.id).catch((error) => {
          showFeedback('error', getAuthErrorMessage(error, 'No se pudo cargar el perfil.'))
          return null
        })

        if (isCancelled) {
          return
        }

        setCurrentProfile(profile)

        if (profile?.is_approved) {
          await refreshDatabase()
        } else {
          resetWorkspaceState()
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        showFeedback('error', getAuthErrorMessage(error, 'No se pudo sincronizar la sesion.'))
      }
    }

    async function initializeAuth() {
      try {
        const activeSession = await getCurrentSession()

        if (isCancelled) {
          return
        }

        await applySession(activeSession)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setAuthError(getAuthErrorMessage(error, 'No se pudo inicializar la autenticacion.'))
        resetWorkspaceState()
      } finally {
        if (!isCancelled) {
          setIsAuthReady(true)
        }
      }
    }

    void initializeAuth()

    const unsubscribe = subscribeToAuthChanges((event, nextSession) => {
      if (isCancelled) {
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset')
        setAuthNotice('')
        setAuthError('')
      } else if (event === 'SIGNED_OUT') {
        setAuthView('signin')
      }

      void applySession(nextSession).finally(() => {
        if (!isCancelled) {
          setIsAuthReady(true)
        }
      })
    })

    return () => {
      isCancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    listAttachmentMetadata()
      .then(setAttachmentIndex)
      .catch(() => setAttachmentIndex({}))
  }, [session])

  function selectTable(tableName) {
    setSelectedTableName(tableName)
    setRecordListMode('active')
    setSelectedRecordIndex(null)
    setActiveProbetaDraftId(null)
    setDraft(createEmptyDraft(tableName, getTable(tableName)))
    setFormMode(null)
    setActiveProbetaStep(PROBETA_STEPS[0])
    setActiveRecipeStepIndex(0)
    setFormFieldErrors({})
    setArchivedReferenceLabels({})
    void refreshDatabase('active')
  }

  function openCreateForm() {
    if (recordListMode === 'archived') {
      return
    }

    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear registros.')
      return
    }

    setSelectedRecordIndex(null)
    setActiveProbetaDraftId(null)
    setDraft(createEmptyDraft(selectedTableName, getTable(selectedTableName)))
    setFormMode('create')
    setActiveProbetaStep(PROBETA_STEPS[0])
    setActiveRecipeStepIndex(0)
    setFormFieldErrors({})
    setArchivedReferenceLabels({})
  }

  function getPersistedArchivedReferences(tableName, record) {
    if (!record?.id) {
      return []
    }

    const references = (getTable(tableName)?.fields ?? [])
      .filter((field) => getReferencedTableName(field) && record[field.name])
      .map((field) => ({
        ownerTable: tableName,
        ownerId: record.id,
        fieldName: field.name,
        referencedTable: getReferencedTableName(field),
        referencedId: record[field.name],
      }))

    if (tableName !== 'PROBETA') {
      return references
    }

    const layerIds = (database.PROBETA_CAPA ?? [])
      .filter((link) => String(link.probeta_id) === String(record.id))
      .map((link) => link.capa_id)

    const layerReferences = (database.CAPA ?? [])
      .filter((layer) => layerIds.some((layerId) => String(layerId) === String(layer.id)))
      .filter((layer) => layer.pre_impregnado_id)
      .map((layer) => ({
        ownerTable: 'CAPA',
        ownerId: layer.id,
        fieldName: 'pre_impregnado_id',
        referencedTable: 'PRE-IMPREGNADO',
        referencedId: layer.pre_impregnado_id,
      }))

    return [...references, ...layerReferences]
  }

  async function loadArchivedReferenceLabels(tableName, record) {
    const references = getPersistedArchivedReferences(tableName, record)

    if (!references.length) {
      setArchivedReferenceLabels({})
      return
    }

    try {
      const labels = await getArchivedReferenceLabels(references)
      setArchivedReferenceLabels(
        Object.fromEntries(
          labels.map((label) => [`${label.referenced_table}:${label.referenced_id}`, label.label]),
        ),
      )
    } catch {
      setArchivedReferenceLabels({})
    }
  }

  function openRecordForm(index) {
    const selectedRecord = sectionRecords[index]

    if (selectedTableName === 'PROBETA' && selectedRecord?.isDraft) {
      setSelectedRecordIndex(null)
      setActiveProbetaDraftId(selectedRecord.draftId)
      setDraft(selectedRecord.draftPayload)
      setArchivedReferenceLabels({})
      setFormMode('create')
      setActiveProbetaStep(PROBETA_STEPS[0])
      setActiveRecipeStepIndex(0)
      setFormFieldErrors({})
      return
    }

    setSelectedRecordIndex(index)
    setActiveProbetaDraftId(null)
    const source = sectionRecordsRaw[index]
    void loadArchivedReferenceLabels(selectedTableName, source)
    setDraft(
      selectedTableName === 'PROBETA'
        ? buildProbetaDraftFromRecord(source, database)
        : selectedTableName === 'RECETAS'
          ? buildRecetaDraftFromRecord(source, database)
        : { ...source },
    )
    setFormMode(recordListMode === 'archived' ? 'view' : permissions.canUpdate ? 'edit' : 'view')
    setActiveProbetaStep(PROBETA_STEPS[0])
    setActiveRecipeStepIndex(0)
    setFormFieldErrors({})
  }

  function getDraftAttachmentIds(tableName, sourceDraft) {
    const fields = SIMPLE_SECTION_FIELDS[tableName] ?? []

    return fields
      .filter(isPdfField)
      .map((field) => sourceDraft?.[field.name])
      .filter(Boolean)
  }

  function cleanupDraftAttachments(tableName, sourceDraft, persistedRecord = null) {
    const draftAttachmentIds = getDraftAttachmentIds(tableName, sourceDraft)
    const persistedAttachmentIds = persistedRecord ? getRecordAttachmentIds(tableName, persistedRecord) : []
    const attachmentIdsToDelete = draftAttachmentIds.filter(
      (attachmentId) => !persistedAttachmentIds.includes(attachmentId),
    )

    removeAttachmentIds(attachmentIdsToDelete)
  }

  function closeForm({ discardUnsavedAttachments = true } = {}) {
    if (
      discardUnsavedAttachments &&
      selectedTableName !== 'PROBETA' &&
      selectedTableName !== 'RECETAS'
    ) {
      const persistedRecord = selectedRecordIndex !== null ? sectionRecordsRaw[selectedRecordIndex] : null
      cleanupDraftAttachments(selectedTableName, draft, persistedRecord)
    }

    setSelectedRecordIndex(null)
    setActiveProbetaDraftId(null)
    setDraft(createEmptyDraft(selectedTableName, getTable(selectedTableName)))
    setFormMode(null)
    setActiveRecipeStepIndex(0)
    setFormFieldErrors({})
  }

  function getAttachmentTableName(targetDraft, options = {}) {
    if (options.tableName) {
      return options.tableName
    }

    if (targetDraft === 'preImpregnadoDraft') {
      return 'PRE-IMPREGNADO'
    }

    if (targetDraft === 'relatedRecordDraft') {
      return relatedRecordModal?.tableName ?? 'documentos'
    }

    return selectedTableName
  }

  function setDraftFieldValue(targetDraft, fieldName, value) {
    if (targetDraft === 'preImpregnadoDraft') {
      setPreImpregnadoDraft((currentDraft) => ({
        ...currentDraft,
        [fieldName]: value,
      }))
      return
    }

    if (targetDraft === 'relatedRecordDraft') {
      setRelatedRecordDraft((currentDraft) => ({
        ...currentDraft,
        [fieldName]: value,
      }))
      return
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      [fieldName]: value,
    }))
  }

  function handleFieldChange(field, rawValue) {
    clearFormFieldError(field.name)
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field.name]:
        field.type === 'bool'
          ? rawValue
          : parseFieldValue(field, rawValue),
    }))
  }

  function handleLayerChange(index, key, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      capas: currentDraft.capas.map((layer, layerIndex) =>
        layerIndex === index ? { ...layer, [key]: value } : layer,
      ),
    }))
  }

  function handleRecipeFieldChange(name, type, rawValue) {
    handleFieldChange({ name, type }, rawValue)
  }

  function handleRecipeStepFieldChange(index, name, rawValue) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      escalones: currentDraft.escalones.map((step, stepIndex) =>
        stepIndex === index
          ? updateRecipeStep(
              step,
              name,
              ['temp_dwell', 'pres_dwell', 'vacio_dwell', 'temp_control_mode', 'pres_control_mode', 'vacio_control_mode'].includes(name)
                ? rawValue
                : parseFieldValue({ name, type: 'float4' }, rawValue),
            )
          : step,
      ),
    }))
  }

  function handleRecetaModalFieldChange(name, type, rawValue) {
    clearFormFieldError(name)
    setRecetaDraft((currentDraft) => ({
      ...currentDraft,
      [name]: parseFieldValue({ name, type }, rawValue),
    }))
  }

  function handleRecetaModalStepFieldChange(index, name, rawValue) {
    setRecetaDraft((currentDraft) => ({
      ...currentDraft,
      escalones: currentDraft.escalones.map((step, stepIndex) =>
        stepIndex === index
          ? updateRecipeStep(
              step,
              name,
              ['temp_dwell', 'pres_dwell', 'vacio_dwell', 'temp_control_mode', 'pres_control_mode', 'vacio_control_mode'].includes(name)
                ? rawValue
                : parseFieldValue({ name, type: 'float4' }, rawValue),
            )
          : step,
      ),
    }))
  }

  function handleAddRecipeStep() {
    setDraft((currentDraft) => {
      const nextSteps = [...currentDraft.escalones, createEmptyRecipeStep(currentDraft.escalones.length + 1)]
      return { ...currentDraft, escalones: nextSteps }
    })
    setActiveRecipeStepIndex(draft.escalones.length)
  }

  function handleRemoveRecipeStep(index) {
    setDraft((currentDraft) => {
      const nextSteps =
        currentDraft.escalones.length === 1
          ? [createEmptyRecipeStep(1)]
          : currentDraft.escalones
              .filter((_, stepIndex) => stepIndex !== index)
              .map((step, stepIndex) => ({ ...step, escalon: stepIndex + 1 }))
      return { ...currentDraft, escalones: nextSteps }
    })
    setActiveRecipeStepIndex((current) => Math.max(0, Math.min(current, draft.escalones.length - 2)))
  }

  function handleAddRecetaModalStep() {
    setRecetaDraft((currentDraft) => {
      const nextSteps = [...currentDraft.escalones, createEmptyRecipeStep(currentDraft.escalones.length + 1)]
      return { ...currentDraft, escalones: nextSteps }
    })
    setRecetaModalStepIndex(recetaDraft.escalones.length)
  }

  function handleRemoveRecetaModalStep(index) {
    setRecetaDraft((currentDraft) => {
      const nextSteps =
        currentDraft.escalones.length === 1
          ? [createEmptyRecipeStep(1)]
          : currentDraft.escalones
              .filter((_, stepIndex) => stepIndex !== index)
              .map((step, stepIndex) => ({ ...step, escalon: stepIndex + 1 }))
      return { ...currentDraft, escalones: nextSteps }
    })
    setRecetaModalStepIndex((current) =>
      Math.max(0, Math.min(current, recetaDraft.escalones.length - 2)),
    )
  }

  function handleReorderRecetaModalStep(fromIndex, toIndex) {
    setRecetaDraft((currentDraft) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentDraft.escalones.length ||
        toIndex >= currentDraft.escalones.length
      ) {
        return currentDraft
      }

      return {
        ...currentDraft,
        escalones: moveItem(currentDraft.escalones, fromIndex, toIndex),
      }
    })
    setRecetaModalStepIndex(toIndex)
  }

  function handleReorderRecipeStep(fromIndex, toIndex) {
    setDraft((currentDraft) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentDraft.escalones.length ||
        toIndex >= currentDraft.escalones.length
      ) {
        return currentDraft
      }

      return {
        ...currentDraft,
        escalones: moveItem(currentDraft.escalones, fromIndex, toIndex),
      }
    })
    setActiveRecipeStepIndex(toIndex)
  }

  function handleAddLayer() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      capas: [...currentDraft.capas, createEmptyLayer()],
    }))
  }

  function handleRemoveLayer(index) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      capas:
        currentDraft.capas.length === 1
          ? [createEmptyLayer()]
          : currentDraft.capas.filter((_, layerIndex) => layerIndex !== index),
    }))
  }

  function handleReorderLayers(fromIndex, toIndex) {
    setDraft((currentDraft) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentDraft.capas.length ||
        toIndex >= currentDraft.capas.length
      ) {
        return currentDraft
      }

      return {
        ...currentDraft,
        capas: moveItem(currentDraft.capas, fromIndex, toIndex),
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formMode === 'view') {
      closeForm()
      return
    }

    if (formMode === 'create' && !permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear registros.')
      return
    }

    if (formMode === 'edit' && !permissions.canUpdate) {
      showFeedback('error', 'Tu rol no puede editar registros.')
      return
    }

    let attachmentIdsToDelete = []

    if (
      selectedTableName !== 'PROBETA' &&
      selectedTableName !== 'RECETAS' &&
      formMode === 'edit' &&
      selectedRecordIndex !== null
    ) {
      const previousRecord = sectionRecordsRaw[selectedRecordIndex]
      const previousAttachmentIds = getRecordAttachmentIds(selectedTableName, previousRecord)
      const nextAttachmentIds = getRecordAttachmentIds(selectedTableName, draft)
      attachmentIdsToDelete = previousAttachmentIds.filter(
        (attachmentId) => !nextAttachmentIds.includes(attachmentId),
      )
    }

    try {
      if (selectedTableName === 'PROBETA') {
        const existingProbeta = selectedRecordIndex !== null ? sectionRecordsRaw[selectedRecordIndex] : null
        await saveProbetaRecord(draft, database, existingProbeta)

        if (activeProbetaDraftId) {
          try {
            await deleteProbetaDraft(activeProbetaDraftId)
          } catch {
            await refreshDatabase()
            showFeedback(
              'error',
              'La probeta se creó, pero el borrador no pudo eliminarse. Puedes descartarlo desde la lista.',
            )
            closeForm({ discardUnsavedAttachments: false })
            return
          }
        }
      } else if (selectedTableName === 'RECETAS') {
        const existingRecipe = selectedRecordIndex !== null ? sectionRecordsRaw[selectedRecordIndex] : null
        await saveRecetaRecord(draft, existingRecipe?.id ?? null)
      } else {
        await saveSimpleRecord(selectedTableName, draft)
      }

      await refreshDatabase()
      removeAttachmentIds(attachmentIdsToDelete)
      showFeedback(
        'success',
        formMode === 'edit' ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.',
      )
      closeForm({ discardUnsavedAttachments: false })
    } catch (error) {
      showSafeError(error, 'No se pudo guardar el registro.', { markField: true })
    }
  }

  async function handleSaveProbetaDraft() {
    const operationKey = `save-probeta-draft:${activeProbetaDraftId ?? 'new'}`

    await runExclusiveOperation(operationKey, async () => {
      if (!permissions.canCreate) {
        showFeedback('error', 'Tu rol no puede crear registros.')
        return
      }

      try {
        const savedDraft = await saveProbetaDraft(draft, activeProbetaDraftId)
        setActiveProbetaDraftId(savedDraft.id)
        await refreshDatabase()
        showFeedback('success', 'Borrador guardado correctamente.')
        closeForm({ discardUnsavedAttachments: false })
      } catch (error) {
        showSafeError(error, 'No se pudo guardar el borrador.', { markField: true })
      }
    })
  }

  async function handleDiscardActiveProbetaDraft() {
    if (!activeProbetaDraftId) {
      closeForm()
      return
    }

    const operationKey = `delete-probeta-draft:${activeProbetaDraftId}`

    await runExclusiveOperation(operationKey, async () => {
      try {
        await deleteProbetaDraft(activeProbetaDraftId)
        await refreshDatabase()
        showFeedback('success', 'Borrador descartado correctamente.')
        closeForm({ discardUnsavedAttachments: false })
      } catch (error) {
        showSafeError(error, 'No se pudo descartar el borrador.')
      }
    })
  }

  async function deleteRecord(index) {
    const selectedRecord = sectionRecords[index]

    if (selectedRecord?.isDraft) {
      await deleteProbetaDraft(selectedRecord.draftId)
      await refreshDatabase()
      showFeedback('success', 'Borrador descartado correctamente.')
      return
    }

    if (selectedTableName !== 'PROBETA' && selectedTableName !== 'RECETAS') {
      removeAttachmentIds(getRecordAttachmentIds(selectedTableName, sectionRecordsRaw[index]))
    }

    if (selectedTableName === 'PROBETA') {
      await deleteProbetaRecord(sectionRecordsRaw[index], database)
    } else if (selectedTableName === 'RECETAS') {
      await deleteRecetaRecord(sectionRecordsRaw[index]?.id)
    } else {
      await deleteSimpleRecord(selectedTableName, sectionRecordsRaw[index]?.id)
    }

    await refreshDatabase()
    showFeedback('success', 'Registro eliminado correctamente.')
  }

  function getRecordActions(record) {
    if (record?.isDraft) {
      return [{ kind: 'discard', label: 'Descartar' }]
    }

    const recordAction = getRecordAction({
      tableName: selectedTableName,
      record,
      database,
    })

    if (recordAction === 'both') {
      return [
        { kind: 'archive', label: 'Archivar' },
        { kind: 'delete', label: 'Eliminar' },
      ]
    }

    if (recordAction === 'archive') {
      return [{ kind: 'archive', label: 'Archivar' }]
    }

    if (recordAction === 'restore') {
      return [{ kind: 'restore', label: 'Restaurar' }]
    }

    return recordAction === 'delete' ? [{ kind: 'delete', label: 'Eliminar' }] : []
  }

  function requestRecordAction(action, index) {
    const selectedRecord = sectionRecords[index]

    if (action === 'discard') {
      const operationKey = getRecordActionOperationKey(action, index)
      void runExclusiveOperation(operationKey, async () => {
        setPendingDeleteKeys((currentKeys) => new Set(currentKeys).add(operationKey))
        try {
          await deleteRecord(index)
        } catch (error) {
          showSafeError(error, 'No se pudo descartar el borrador.')
        } finally {
          setPendingDeleteKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys)
            nextKeys.delete(operationKey)
            return nextKeys
          })
        }
      })
      return
    }

    if (action === 'delete' && !permissions.canDelete) {
      showFeedback('error', 'Tu rol no puede eliminar registros.')
      return
    }

    if (action === 'archive' && !permissions.canArchive) {
      showFeedback('error', 'Tu rol no puede archivar registros.')
      return
    }

    if (action === 'restore' && !permissions.canRestore) {
      showFeedback('error', 'Tu rol no puede restaurar registros.')
      return
    }

    if (selectedRecord) {
      setPendingRecordAction({ action, index, recordLabel: getRecordLabel(selectedRecord, index) })
    }
  }

  async function confirmRecordAction() {
    if (!pendingRecordAction) {
      return
    }

    const { action, index } = pendingRecordAction
    const selectedRecord = sectionRecords[index]
    const operationKey = getRecordActionOperationKey(action, index)

    await runExclusiveOperation(operationKey, async () => {
      setPendingDeleteKeys((currentKeys) => new Set(currentKeys).add(operationKey))

      try {
        if (action === 'delete') {
          const currentAction = getRecordAction({
            tableName: selectedTableName,
            record: selectedRecord,
            database,
          })

          if (currentAction === 'archive') {
            setPendingRecordAction({
              action: 'archive',
              index,
              recordLabel: getRecordLabel(selectedRecord, index),
            })
            showFeedback('error', 'El registro está en uso y solo puede archivarse.')
            return
          }

          await deleteRecord(index)
        } else if (action === 'archive') {
          await archiveRecord(selectedTableName, selectedRecord.id)
          await refreshDatabase()
          showFeedback('success', 'Registro archivado correctamente.')
        } else if (action === 'restore') {
          await restoreRecord(selectedTableName, selectedRecord.id)
          await refreshDatabase()
          showFeedback('success', 'Registro restaurado correctamente.')
        }

        setPendingRecordAction(null)
      } catch (error) {
        showSafeError(
          error,
          action === 'archive'
            ? 'No se pudo archivar el registro.'
            : action === 'restore'
              ? 'No se pudo restaurar el registro.'
              : 'No se pudo eliminar el registro.',
        )
      } finally {
        setPendingDeleteKeys((currentKeys) => {
          const nextKeys = new Set(currentKeys)
          nextKeys.delete(operationKey)
          return nextKeys
        })
      }
    })
  }

  function openRelatedRecordModal(tableName, fieldName, targetDraft) {
    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear registros relacionados.')
      return
    }

    setRelatedRecordModal({ tableName, fieldName, targetDraft })
    setRelatedRecordDraft(createBaseRecord(getTable(tableName)))
    setFormFieldErrors({})
  }

  function closeRelatedRecordModal({ discardUnsavedAttachments = true } = {}) {
    if (discardUnsavedAttachments && relatedRecordModal && relatedRecordDraft) {
      cleanupDraftAttachments(relatedRecordModal.tableName, relatedRecordDraft)
    }

    setRelatedRecordModal(null)
    setRelatedRecordDraft(null)
    setFormFieldErrors({})
  }

  function assignRelatedRecordToDraft(targetDraft, fieldName, recordId) {
    setDraftFieldValue(targetDraft, fieldName, recordId)
  }

  function handleRelatedRecordFieldChange(field, rawValue) {
    clearFormFieldError(field.name)
    setRelatedRecordDraft((currentDraft) => ({
      ...currentDraft,
      [field.name]:
        field.type === 'bool'
          ? rawValue
          : parseFieldValue(field, rawValue),
    }))
  }

  async function handleCreateRelatedRecord(event) {
    event.preventDefault()

    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear registros relacionados.')
      return
    }

    if (!relatedRecordModal || !relatedRecordDraft) {
      return
    }

    const { tableName, fieldName, targetDraft } = relatedRecordModal
    const keyField = 'alias' in relatedRecordDraft ? 'alias' : 'nombre'
    const rawName = String(relatedRecordDraft[keyField] ?? '').trim()

    if (!rawName) {
      return
    }

    const existingRecord = (database[tableName] ?? []).find(
      (record) => String(record[keyField] ?? '').toLowerCase() === rawName.toLowerCase(),
    )

    if (existingRecord) {
      assignRelatedRecordToDraft(targetDraft, fieldName, existingRecord.id)
      closeRelatedRecordModal()
      return
    }

    const newRecord = {
      ...relatedRecordDraft,
      [keyField]: rawName,
    }

    try {
      const savedRecord = await saveSimpleRecord(tableName, newRecord)
      await refreshDatabase()
      assignRelatedRecordToDraft(targetDraft, fieldName, savedRecord.id)
      showFeedback('success', 'Registro relacionado creado correctamente.')
      closeRelatedRecordModal({ discardUnsavedAttachments: false })
    } catch (error) {
      showSafeError(error, 'No se pudo guardar el registro relacionado.', { markField: true })
    }
  }

  async function handleAttachmentUpload(targetDraft, fieldName, file, options = {}) {
    try {
      const metadata = await saveAttachment(file, {
        tableName: getAttachmentTableName(targetDraft, options),
        fieldName,
      })

      setAttachmentIndex((currentIndex) => ({
        ...currentIndex,
        [metadata.id]: metadata,
      }))
      setDraftFieldValue(targetDraft, fieldName, metadata.id)
    } catch (error) {
      showSafeError(error, 'No se pudo subir el PDF.')
    }
  }

  function handleAttachmentClear(targetDraft, fieldName) {
    setDraftFieldValue(targetDraft, fieldName, '')
  }

  async function handleAttachmentDownload(attachmentId) {
    try {
      await downloadAttachment(attachmentId)
    } catch (error) {
      showSafeError(error, 'No se pudo descargar el archivo.')
    }
  }

  async function handleAttachmentPreview(attachmentId) {
    try {
      await previewAttachment(attachmentId)
    } catch (error) {
      showSafeError(error, 'No se pudo abrir el PDF.')
    }
  }

  function removeAttachmentIds(attachmentIds) {
    attachmentIds
      .filter(Boolean)
      .forEach((attachmentId) => {
        deleteAttachment(attachmentId).catch(() => {})
        setAttachmentIndex((currentIndex) => {
          const nextIndex = { ...currentIndex }
          delete nextIndex[attachmentId]
          return nextIndex
        })
      })
  }

  function getRecordAttachmentIds(tableName, record) {
    const fields = SIMPLE_SECTION_FIELDS[tableName] ?? []

    return fields
      .filter(isPdfField)
      .map((field) => record?.[field.name])
      .filter(Boolean)
  }

  function renderFieldControlForDraft(formDraft, onChangeField, field, options = {}) {
    const referencedTableName = getReferencedTableName(field)
    const referencedRecords = referencedTableName
      ? database[referencedTableName] ?? []
      : []
    const value = formDraft[field.name]
    const archivedReferenceLabel = referencedTableName
      ? archivedReferenceLabels[`${referencedTableName}:${value}`]
      : null
    const isReadOnly = Boolean(options.readOnly)
    const enableInlineCreate = Boolean(
      !isReadOnly &&
      options.targetDraft &&
        referencedTableName &&
        SIMPLE_SECTION_FIELDS[referencedTableName] &&
        permissions.canCreate,
    )

    if (field.type === 'bool') {
      return (
        <label className="switch-field">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={isReadOnly}
            onChange={(event) => onChangeField(field, event.target.checked)}
          />
          <span>{value ? 'Si' : 'No'}</span>
        </label>
      )
    }

    if (isPdfField(field)) {
      const fileMetadata = attachmentIndex[value] ?? getAttachmentMetadata(value)

      return (
        <PdfDropzone
          fileMetadata={fileMetadata}
          disabled={isReadOnly}
          onSelectFile={(file) =>
            handleAttachmentUpload(options.targetDraft, field.name, file, options)
          }
          onClearFile={() => handleAttachmentClear(options.targetDraft, field.name)}
          onDownloadFile={() => handleAttachmentDownload(value)}
          onPreviewFile={() => handleAttachmentPreview(value)}
        />
      )
    }

    if (referencedTableName) {
      return (
        <select
          value={value}
          disabled={isReadOnly}
          onChange={(event) => {
            if (event.target.value === '__new_reference__') {
              openRelatedRecordModal(
                referencedTableName,
                field.name,
                options.targetDraft,
              )
              return
            }

            onChangeField(field, event.target.value)
          }}
        >
          <option value="">Selecciona una opcion</option>
          {archivedReferenceLabel ? (
            <option value={value} disabled>
              {archivedReferenceLabel}
            </option>
          ) : null}
          {referencedRecords.map((record, index) => (
            <option key={`${referencedTableName}-${index}`} value={record.id ?? ''}>
              {getRecordLabel(record, index)}
            </option>
          ))}
          {enableInlineCreate ? (
            <option value="__new_reference__">
              {`+ Anadir nuevo ${getFieldLabel(field.name).toLowerCase()}`}
            </option>
          ) : null}
        </select>
      )
    }

    if (field.name === 'descripcion' || field.name === 'anotaciones') {
      return (
        <textarea
          rows="4"
          value={value}
          readOnly={isReadOnly}
          onChange={(event) => onChangeField(field, event.target.value)}
        />
      )
    }

    return (
      <input
        type={getInputType(field)}
        value={value}
        readOnly={isReadOnly}
        onChange={(event) => onChangeField(field, event.target.value)}
      />
    )
  }

  function renderFieldControl(field) {
    return renderFieldControlForDraft(
      draft,
      handleFieldChange,
      field,
      selectedTableName === 'PRE-IMPREGNADO'
        ? { targetDraft: 'draft', tableName: 'PRE-IMPREGNADO', readOnly: formMode === 'view' }
        : { targetDraft: 'draft', tableName: selectedTableName, readOnly: formMode === 'view' },
    )
  }

  function openAcabadoModal(fieldName = 'acabado_id') {
    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear acabados.')
      return
    }

    setPendingAcabadoField(fieldName)
    setAcabadoDraft(createBaseRecord(getTable('ACABADO')))
    setIsAcabadoModalOpen(true)
    setFormFieldErrors({})
  }

  function closeAcabadoModal() {
    setIsAcabadoModalOpen(false)
    setPendingAcabadoField('acabado_id')
    setAcabadoDraft(createBaseRecord(getTable('ACABADO')))
    setFormFieldErrors({})
  }

  function handleAcabadoFieldChange(rawValue) {
    clearFormFieldError('alias')
    setAcabadoDraft((currentDraft) => ({
      ...currentDraft,
      alias: rawValue,
    }))
  }

  async function handleCreateAcabado(event) {
    event.preventDefault()

    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear acabados.')
      return
    }

    const alias = acabadoDraft.alias.trim()
    if (!alias) {
      return
    }

    const existingAcabado = (database.ACABADO ?? []).find(
      (record) => record.alias?.toLowerCase() === alias.toLowerCase(),
    )

    if (existingAcabado) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        [pendingAcabadoField]: existingAcabado.id,
      }))
      closeAcabadoModal()
      return
    }

    const newAcabado = {
      ...acabadoDraft,
      alias,
    }

    try {
      const savedAcabado = await saveSimpleRecord('ACABADO', newAcabado)
      await refreshDatabase()
      setDraft((currentDraft) => ({
        ...currentDraft,
        [pendingAcabadoField]: savedAcabado.id,
      }))
      showFeedback('success', 'Acabado creado correctamente.')
      closeAcabadoModal()
    } catch (error) {
      showSafeError(error, 'No se pudo guardar el acabado.', { markField: true })
    }
  }

  function openPreImpregnadoModal(layerIndex) {
    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear materiales.')
      return
    }

    setPendingLayerIndex(layerIndex)
    setPreImpregnadoDraft(createBaseRecord(getTable('PRE-IMPREGNADO')))
    setIsPreImpregnadoModalOpen(true)
    setFormFieldErrors({})
  }

  function closePreImpregnadoModal({ discardUnsavedAttachments = true } = {}) {
    if (discardUnsavedAttachments) {
      cleanupDraftAttachments('PRE-IMPREGNADO', preImpregnadoDraft)
    }

    setIsPreImpregnadoModalOpen(false)
    setPreImpregnadoDraft(createBaseRecord(getTable('PRE-IMPREGNADO')))
    setPendingLayerIndex(null)
    setFormFieldErrors({})
  }

  function handlePreImpregnadoFieldChange(field, rawValue) {
    clearFormFieldError(field.name)
    setPreImpregnadoDraft((currentDraft) => ({
      ...currentDraft,
      [field.name]:
        field.type === 'bool'
          ? rawValue
          : parseFieldValue(field, rawValue),
    }))
  }

  async function handleCreatePreImpregnado(event) {
    event.preventDefault()

    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear materiales.')
      return
    }

    const textId = String(preImpregnadoDraft.text_id ?? '').trim()
    if (!textId) {
      return
    }

    const existingMaterial = (database['PRE-IMPREGNADO'] ?? []).find(
      (record) => String(record.text_id ?? '').toLowerCase() === textId.toLowerCase(),
    )

    if (existingMaterial) {
      if (pendingLayerIndex !== null) {
        handleLayerChange(pendingLayerIndex, 'pre_impregnado_id', existingMaterial.id)
      }
      closePreImpregnadoModal()
      return
    }

    const newMaterial = {
      ...preImpregnadoDraft,
      text_id: textId,
    }

    try {
      const savedMaterial = await saveSimpleRecord('PRE-IMPREGNADO', newMaterial)
      await refreshDatabase()

      if (pendingLayerIndex !== null) {
        handleLayerChange(pendingLayerIndex, 'pre_impregnado_id', savedMaterial.id)
      }

      showFeedback('success', 'Material creado correctamente.')
      closePreImpregnadoModal({ discardUnsavedAttachments: false })
    } catch (error) {
      showSafeError(error, 'No se pudo guardar el material.', { markField: true })
    }
  }

  function openRecetaModal() {
    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear recetas.')
      return
    }

    setRecetaDraft(createEmptyDraft('RECETAS', getTable('RECETAS')))
    setRecetaModalStepIndex(0)
    setIsRecetaModalOpen(true)
    setFormFieldErrors({})
  }

  function closeRecetaModal() {
    setIsRecetaModalOpen(false)
    setRecetaDraft(createEmptyDraft('RECETAS', getTable('RECETAS')))
    setRecetaModalStepIndex(0)
    setFormFieldErrors({})
  }

  async function handleCreateReceta(event) {
    event.preventDefault()

    if (!permissions.canCreate) {
      showFeedback('error', 'Tu rol no puede crear recetas.')
      return
    }

    const nombre = recetaDraft.nombre.trim()
    if (!nombre) {
      return
    }

    const existingRecipe = (database.RECETAS ?? []).find(
      (record) => record.nombre?.toLowerCase() === nombre.toLowerCase(),
    )

    if (existingRecipe) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        receta_id: existingRecipe.id,
      }))
      closeRecetaModal()
      return
    }

    try {
      const savedRecipe = await saveRecetaRecord(recetaDraft)
      await refreshDatabase()
      setDraft((currentDraft) => ({
        ...currentDraft,
        receta_id: savedRecipe.id,
      }))
      showFeedback('success', 'Receta creada correctamente.')
      closeRecetaModal()
    } catch (error) {
      showSafeError(error, 'No se pudo guardar la receta.', { markField: true })
    }
  }

  function handleRunSql() {
    return 'La consola SQL local esta desactivada en modo Supabase. Usa el editor SQL de Supabase para consultas reales.'
  }

  async function handleSignIn(credentials) {
    setIsAuthenticating(true)
    setAuthError('')
    setAuthNotice('')
    setAuthView('signin')

    try {
      await signInWithPassword({
        email: String(credentials.email ?? '').trim(),
        password: String(credentials.password ?? ''),
      })
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'No se pudo iniciar sesion.'))
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
      setAuthNotice('')
      setAuthError('')
    } catch (error) {
      showFeedback('error', getAuthErrorMessage(error, 'No se pudo cerrar la sesion.'))
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handlePasswordResetRequest(email) {
    setIsAuthenticating(true)
    setAuthError('')
    setAuthNotice('')

    try {
      await requestPasswordReset(String(email ?? '').trim())
      setAuthNotice('Si el email existe, hemos enviado un enlace de recuperacion.')
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'No se pudo iniciar la recuperacion.'))
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function handlePasswordUpdate(password) {
    setIsAuthenticating(true)
    setAuthError('')
    setAuthNotice('')

    try {
      await updateUserPassword(String(password ?? ''))
      setAuthNotice('Contraseña actualizada correctamente.')
      setAuthView('signin')
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'No se pudo actualizar la contraseña.'))
    } finally {
      setIsAuthenticating(false)
    }
  }

  function openPasswordRecovery() {
    setAuthView('request-reset')
    setAuthError('')
    setAuthNotice('')
  }

  function closePasswordRecovery() {
    setAuthView('signin')
    setAuthError('')
    setAuthNotice('')
  }

  function openUserManagement() {
    if (!permissions.canManageUsers) {
      showFeedback('error', 'Solo un administrador puede gestionar usuarios.')
      return
    }

    setIsUserManagementOpen(true)
    setUserProfilesError('')
    void refreshUserProfiles()
  }

  function closeUserManagement() {
    setIsUserManagementOpen(false)
    setUserProfilesError('')
    setUpdatingProfileId(null)
  }

  async function handleUserRoleChange(userId, role) {
    return runExclusiveOperation(`user:${userId}`, async () => {
      if (!permissions.canManageUsers) {
        showFeedback('error', 'Solo un administrador puede gestionar usuarios.')
        return
      }

      setUpdatingProfileId(userId)
      setUserProfilesError('')

      try {
        const updatedProfile = await updateProfileRole(userId, role)
        setUserProfiles((currentProfiles) =>
          currentProfiles.map((profile) => (profile.id === userId ? updatedProfile : profile)),
        )

        if (currentUser?.id === userId) {
          setCurrentProfile(updatedProfile)

          if (updatedProfile.role !== 'admin') {
            closeUserManagement()
          }
        }

        showFeedback('success', 'Rol actualizado correctamente.')
        await refreshUserProfiles()
      } catch (error) {
        const message = getUserError(error, 'No se pudo actualizar el rol del usuario.').message
        setUserProfilesError(message)
        showFeedback('error', message)
      } finally {
        setUpdatingProfileId(null)
      }
    })
  }

  async function handleUserApprovalToggle(userId, isApproved) {
    return runExclusiveOperation(`user:${userId}`, async () => {
      if (!permissions.canManageUsers) {
        showFeedback('error', 'Solo un administrador puede validar usuarios.')
        return
      }

      setUpdatingProfileId(userId)
      setUserProfilesError('')

      try {
        const updatedProfile = await updateProfileApproval(userId, isApproved)
        setUserProfiles((currentProfiles) =>
          currentProfiles.map((profile) => (profile.id === userId ? updatedProfile : profile)),
        )

        if (currentUser?.id === userId) {
          setCurrentProfile(updatedProfile)

          if (!updatedProfile.is_approved) {
            closeUserManagement()
            resetWorkspaceState()
          }
        }

        showFeedback('success', isApproved ? 'Usuario validado correctamente.' : 'Validacion revocada.')
        await refreshUserProfiles()
      } catch (error) {
        const message = getUserError(error, 'No se pudo actualizar la validacion del usuario.').message
        setUserProfilesError(message)
        showFeedback('error', message)
      } finally {
        setUpdatingProfileId(null)
      }
    })
  }

  async function handleUserCreate({ fullName, email }) {
    return runExclusiveOperation('user:create', async () => {
      if (!permissions.canManageUsers) {
        throw new Error('Solo un administrador puede crear usuarios.')
      }

      setIsCreatingUser(true)
      setUserProfilesError('')

      try {
        await createManagedUser({ fullName, email })
        showFeedback('success', 'Usuario creado y correo de activacion enviado.')
        await refreshUserProfiles()
      } catch (error) {
        const message = getUserError(error, 'No se pudo crear el usuario.').message
        showFeedback('error', message)
        throw new Error(message)
      } finally {
        setIsCreatingUser(false)
      }
    })
  }

  async function handleUserRecovery(profile) {
    return runExclusiveOperation(`user:${profile.id}`, async () => {
      if (!permissions.canManageUsers) {
        showFeedback('error', 'Solo un administrador puede enviar enlaces de recuperacion.')
        return
      }

      setSendingRecoveryUserId(profile.id)
      setUserProfilesError('')

      try {
        await sendManagedPasswordRecovery({
          userId: profile.id,
          email: profile.email,
        })
        showFeedback('success', 'Enlace de recuperacion enviado correctamente.')
      } catch (error) {
        const message = getUserError(error, 'No se pudo enviar el enlace de recuperacion.').message
        setUserProfilesError(message)
        showFeedback('error', message)
      } finally {
        setSendingRecoveryUserId(null)
      }
    })
  }

  async function handleUserDelete(profile) {
    return runExclusiveOperation(`user:${profile.id}`, async () => {
      if (!permissions.canManageUsers) {
        showFeedback('error', 'Solo un administrador puede eliminar usuarios.')
        return
      }

      if (profile.id === currentUser?.id) {
        showFeedback('error', 'No puedes eliminar tu propia cuenta desde este panel.')
        return
      }

      const confirmed = window.confirm(
        `Se eliminara la cuenta de ${profile.full_name || profile.email}. Esta accion no se puede deshacer.`,
      )

      if (!confirmed) {
        return
      }

      setDeletingUserId(profile.id)
      setUserProfilesError('')

      try {
        await deleteManagedUser({ userId: profile.id })
        setUserProfiles((currentProfiles) =>
          currentProfiles.filter((currentProfile) => currentProfile.id !== profile.id),
        )
        showFeedback('success', 'Usuario eliminado correctamente.')
        await refreshUserProfiles()
      } catch (error) {
        const message = getUserError(error, 'No se pudo eliminar el usuario.').message
        setUserProfilesError(message)
        showFeedback('error', message)
      } finally {
        setDeletingUserId(null)
      }
    })
  }

  const currentUserLabel =
    currentProfile?.full_name ||
    currentUser?.email ||
    ''

  function handleNumberInputWheel(event) {
    const target = event.target

    if (!(target instanceof HTMLInputElement) || target.type !== 'number') {
      return
    }

    if (document.activeElement === target) {
      target.blur()
    }

    event.preventDefault()
  }

  if (!isAuthReady) {
    return (
      <div className="app-shell auth-shell">
        <section className="hero-panel auth-status-panel">
          <div>
            <p className="eyebrow">Autenticacion</p>
            <h1>Conectando con Supabase</h1>
            <p className="hero-copy">Comprobando la sesion activa antes de cargar la aplicacion.</p>
          </div>
        </section>
      </div>
    )
  }

  if (!session) {
    if (authView === 'request-reset') {
      return (
        <PasswordRecoveryScreen
          theme={theme}
          onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
          onRequestReset={handlePasswordResetRequest}
          onUpdatePassword={handlePasswordUpdate}
          onCancel={closePasswordRecovery}
          isLoading={isAuthenticating}
          errorMessage={authError}
          noticeMessage={authNotice}
          mode="request"
        />
      )
    }

    return (
        <AuthScreen
          theme={theme}
          onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
          onSignIn={handleSignIn}
          onForgotPassword={openPasswordRecovery}
          isLoading={isAuthenticating}
          errorMessage={authError}
        noticeMessage={authNotice}
      />
    )
  }

  if (authView === 'reset') {
    return (
      <PasswordRecoveryScreen
        theme={theme}
        onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
        onRequestReset={handlePasswordResetRequest}
        onUpdatePassword={handlePasswordUpdate}
        onCancel={closePasswordRecovery}
        isLoading={isAuthenticating}
        errorMessage={authError}
        noticeMessage={authNotice}
        mode="update"
      />
    )
  }

  if (session && currentProfile && !isCurrentUserApproved) {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-layout auth-layout-compact">
          <section className="hero-panel auth-hero-panel auth-hero-panel-compact">
            <div className="auth-hero-topbar">
              <span className="auth-security-pill">Validacion pendiente</span>
              <button
                type="button"
                className="terminal-button"
                onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
                aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
                title={`Tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 3.25v2.1m0 13.3v2.1m8.75-8.75h-2.1M5.35 12H3.25m14.94 6.19-1.48-1.48M6.29 6.29 4.81 4.81m13.38 0-1.48 1.48M6.29 17.71l-1.48 1.48M12 7.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M19.25 14.8A7.75 7.75 0 0 1 9.2 4.75 8.5 8.5 0 1 0 19.25 14.8Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="auth-hero-copy">
              <BrandWordmark className="brand-wordmark-hero brand-wordmark-compact" />
              <p className="eyebrow">Composite Lab</p>
              <h1>Tu cuenta aun no esta activada</h1>
              <p className="auth-hero-description">
                Un administrador debe validar tu acceso antes de habilitar la aplicacion.
              </p>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-card-header">
              <div>
                <p className="eyebrow">Acceso restringido</p>
                <h2>Esperando validacion</h2>
              </div>
              <p className="auth-card-copy">
                Has iniciado sesion como {currentProfile.full_name || currentUser?.email || 'usuario'}.
              </p>
            </div>

            <div className="auth-form">
              <p className="auth-notice">
                Cuando un administrador valide la cuenta podras entrar con normalidad.
              </p>
              <button
                type="button"
                className="ghost-button auth-secondary-button"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Cerrando...' : 'Cerrar sesion'}
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" onWheelCapture={handleNumberInputWheel}>
      {feedbackMessage ? (
        <div className={`feedback-toast ${feedbackMessage.kind}`}>
          <span>{feedbackMessage.message}</span>
          <button type="button" className="feedback-toast-close" onClick={() => setFeedbackMessage(null)}>
            ×
          </button>
        </div>
      ) : null}
      <AppHeader
        onOpenSqlConsole={() => setIsSqlConsoleOpen(true)}
        onOpenUserManagement={openUserManagement}
        canManageUsers={permissions.canManageUsers}
        theme={theme}
        onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
        currentUserLabel={currentUserLabel}
        currentUserRoleLabel={currentUserRoleLabel}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
      />

      <main className="workspace">
        <SectionSidebar
          sectionOrder={SECTION_ORDER}
          selectedTableName={selectedTableName}
          database={database}
          onSelect={selectTable}
        />

        <SectionTable
          title={recordListMode === 'archived' ? `${getTableLabel(selectedTableName)} · Archivados` : getTableLabel(selectedTableName)}
          onCreate={openCreateForm}
          canCreate={permissions.canCreate && recordListMode === 'active'}
          hasRecords={sectionRecords.length > 0}
          statusMessage={
            isLoadingDatabase
              ? 'Cargando datos desde Supabase...'
              : databaseError || undefined
          }
          headerActions={
            permissions.canViewArchived ? (
              <ArchivedRecordsToggle
                isShowingArchived={recordListMode === 'archived'}
                onToggle={() => {
                  const nextMode = recordListMode === 'active' ? 'archived' : 'active'
                  setRecordListMode(nextMode)
                  void refreshDatabase(nextMode)
                }}
              />
            ) : null
          }
        >
          {selectedTableName === 'PROBETA' ? (
            <ProbetaRecordsTable
              records={sectionRecords}
              onOpenRecord={openRecordForm}
              onDelete={() => {}}
              onRecordAction={requestRecordAction}
              getRecordActions={getRecordActions}
              primaryActionLabel={permissions.canUpdate ? 'Editar' : 'Ver'}
              isDeletePending={(index) =>
                isRecordActionPending('delete', index) || isRecordActionPending('discard', index)
              }
              isActionPending={isRecordActionPending}
            />
          ) : (
            <>
              {selectedTableName === 'RECETAS' ? (
                <div className="recipe-table-controls">
                  <div className="recipe-temperature-unit-control" aria-label="Unidades de temperatura">
                    <span className="recipe-temperature-unit-label">Unidades</span>
                    <div className="recipe-temperature-unit-options">
                      {['celsius', 'fahrenheit'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          className={recipeTableTemperatureUnit === unit ? 'active' : ''}
                          aria-pressed={recipeTableTemperatureUnit === unit}
                          onClick={() => setRecipeTableTemperatureUnit(unit)}
                        >
                          {unit === 'celsius' ? '°C' : '°F'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              <SimpleRecordsTable
                fields={
                  selectedTableName === 'RECETAS'
                    ? [...recipeTableFields, { name: 'escalones', type: 'int4' }]
                    : simpleTableFields
                }
                records={sectionRecords}
                database={database}
                onOpenRecord={openRecordForm}
                onDelete={() => {}}
                onRecordAction={requestRecordAction}
                getRecordActions={getRecordActions}
                primaryActionLabel={permissions.canUpdate ? 'Editar' : 'Ver'}
                isDeletePending={(index) => isRecordActionPending('delete', index)}
                isActionPending={isRecordActionPending}
                selectedTableName={selectedTableName}
                renderCellValue={(field, record) => {
                  if (
                    selectedTableName === 'RECETAS' &&
                    ['temperatura_inicial_c', 'pico_temperatura_c'].includes(field.name)
                  ) {
                    const value = record[field.name]

                    if (value === '' || value === null || value === undefined) {
                      return 'Sin dato'
                    }

                    return `${formatTemperatureInput(value, recipeTableTemperatureUnit)} ${
                      recipeTableTemperatureUnit === 'fahrenheit' ? '°F' : '°C'
                    }`
                  }

                  if (!isPdfField(field)) {
                    return formatCellValue(field, record[field.name], database)
                  }

                  const attachmentId = record[field.name]
                  const fileMetadata =
                    attachmentIndex[attachmentId] ?? getAttachmentMetadata(attachmentId)

                  if (!attachmentId) {
                    return 'Sin archivo'
                  }

                  return (
                    <div className="file-cell">
                      <span className="file-name">{fileMetadata?.name ?? 'PDF'}</span>
                      <button
                        type="button"
                        className="ghost-button compact"
                        onClick={() => handleAttachmentPreview(attachmentId)}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="ghost-button compact"
                        onClick={() => handleAttachmentDownload(attachmentId)}
                      >
                        Descargar
                      </button>
                    </div>
                  )
                }}
              />
            </>
          )}
        </SectionTable>
      </main>

      {pendingRecordAction ? (
        <RecordActionConfirmation
          action={pendingRecordAction.action}
          recordLabel={pendingRecordAction.recordLabel}
          isSubmitting={isRecordActionPending(
            pendingRecordAction.action,
            pendingRecordAction.index,
          )}
          onCancel={() => setPendingRecordAction(null)}
          onConfirm={confirmRecordAction}
        />
      ) : null}

      {formMode ? (
        <FormModal
          title={getTableLabel(selectedTableName)}
          mode={formMode}
          onClose={closeForm}
          onSubmit={handleSubmit}
          onSaveDraft={
            selectedTableName === 'PROBETA' && formMode === 'create'
              ? handleSaveProbetaDraft
              : undefined
          }
          onDiscard={
            selectedTableName === 'PROBETA' && activeProbetaDraftId
              ? handleDiscardActiveProbetaDraft
              : undefined
          }
          submitLabel={selectedTableName === 'PROBETA' ? 'Guardar probeta' : undefined}
        >
          <div className="form-fieldset">
            {selectedTableName === 'PROBETA' ? (
              <ProbetaForm
              draft={draft}
              database={database}
              activeStep={activeProbetaStep}
              steps={PROBETA_STEPS}
              calculatedThickness={probetaAverageThickness}
              calculatedThicknessWithoutCuring={probetaAverageThicknessWithoutCuring}
              calculatedDensity={probetaCalculatedDensity}
              isReadOnly={formMode === 'view'}
              archivedReferenceLabels={archivedReferenceLabels}
              onStepChange={setActiveProbetaStep}
                onFieldChange={handleFieldChange}
                onLayerChange={handleLayerChange}
                onAddLayer={handleAddLayer}
                onRemoveLayer={handleRemoveLayer}
                onReorderLayers={handleReorderLayers}
                getRecordLabel={getRecordLabel}
                onOpenAcabadoForm={openAcabadoModal}
                onOpenPreImpregnadoForm={openPreImpregnadoModal}
                onOpenRecetaForm={openRecetaModal}
              />
            ) : selectedTableName === 'RECETAS' ? (
              <RecetaForm
                draft={draft}
                activeStepIndex={activeRecipeStepIndex}
                isReadOnly={formMode === 'view'}
                fieldErrors={formFieldErrors}
                onRecipeFieldChange={handleRecipeFieldChange}
                onStepFieldChange={handleRecipeStepFieldChange}
                onAddStep={handleAddRecipeStep}
                onRemoveStep={handleRemoveRecipeStep}
                onReorderStep={handleReorderRecipeStep}
                onSelectStep={setActiveRecipeStepIndex}
              />
            ) : (
              <SimpleSectionForm
                fields={simpleFields}
                fieldErrors={formFieldErrors}
                renderFieldControl={renderFieldControl}
              />
            )}
          </div>
        </FormModal>
      ) : null}

      {isSqlConsoleOpen ? (
        <SqlConsoleModal
          onClose={() => setIsSqlConsoleOpen(false)}
          onRun={handleRunSql}
        />
      ) : null}

      {isAcabadoModalOpen ? (
        <FormModal
          title="Nuevo acabado"
          mode="create"
          onClose={closeAcabadoModal}
          onSubmit={handleCreateAcabado}
        >
          <label className={`form-field ${formFieldErrors.alias ? 'has-field-error' : ''}`}>
            <span className="field-label">Nombre del acabado</span>
            <input
              type="text"
              value={acabadoDraft.alias}
              onChange={(event) => handleAcabadoFieldChange(event.target.value)}
              autoFocus
            />
          </label>
        </FormModal>
      ) : null}

      {isPreImpregnadoModalOpen ? (
        <FormModal
          title="Nuevo material"
          mode="create"
          onClose={closePreImpregnadoModal}
          onSubmit={handleCreatePreImpregnado}
        >
          <SimpleSectionForm
            fields={SIMPLE_SECTION_FIELDS['PRE-IMPREGNADO']}
            fieldErrors={formFieldErrors}
              renderFieldControl={(field) =>
                renderFieldControlForDraft(
                  preImpregnadoDraft,
                  handlePreImpregnadoFieldChange,
                  field,
                  { targetDraft: 'preImpregnadoDraft', tableName: 'PRE-IMPREGNADO' },
                )
              }
            />
        </FormModal>
      ) : null}

      {isRecetaModalOpen ? (
        <FormModal
          title="Nueva receta"
          mode="create"
          onClose={closeRecetaModal}
          onSubmit={handleCreateReceta}
        >
          <RecetaForm
            draft={recetaDraft}
            activeStepIndex={recetaModalStepIndex}
            fieldErrors={formFieldErrors}
            onRecipeFieldChange={handleRecetaModalFieldChange}
            onStepFieldChange={handleRecetaModalStepFieldChange}
            onAddStep={handleAddRecetaModalStep}
            onRemoveStep={handleRemoveRecetaModalStep}
            onReorderStep={handleReorderRecetaModalStep}
            onSelectStep={setRecetaModalStepIndex}
          />
        </FormModal>
      ) : null}

      {relatedRecordModal && relatedRecordDraft ? (
        <FormModal
          title={`Nuevo ${getTableLabel(relatedRecordModal.tableName).toLowerCase()}`}
          mode="create"
          onClose={closeRelatedRecordModal}
          onSubmit={handleCreateRelatedRecord}
        >
          <SimpleSectionForm
            fields={SIMPLE_SECTION_FIELDS[relatedRecordModal.tableName] ?? []}
            fieldErrors={formFieldErrors}
              renderFieldControl={(field) =>
                renderFieldControlForDraft(
                  relatedRecordDraft,
                  handleRelatedRecordFieldChange,
                  field,
                  {
                    targetDraft: 'relatedRecordDraft',
                    tableName: relatedRecordModal.tableName,
                  },
                )
              }
            />
        </FormModal>
      ) : null}

      {isUserManagementOpen ? (
        <UserManagementModal
          profiles={userProfiles}
          currentUserId={currentUser?.id ?? null}
          isLoading={isLoadingUserProfiles}
          errorMessage={userProfilesError}
          onClose={closeUserManagement}
          onRefresh={refreshUserProfiles}
          onRoleChange={handleUserRoleChange}
          onApprovalToggle={handleUserApprovalToggle}
          onCreateUser={handleUserCreate}
          onSendRecovery={handleUserRecovery}
          onDeleteUser={handleUserDelete}
          updatingUserId={updatingProfileId}
          isCreatingUser={isCreatingUser}
          isSendingRecoveryForUserId={sendingRecoveryUserId}
          isDeletingUserId={deletingUserId}
        />
      ) : null}
    </div>
  )
}

export default App
