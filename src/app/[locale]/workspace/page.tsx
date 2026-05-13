'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import ConfirmDialog from '@/components/ConfirmDialog'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon, IconGradientDefs } from '@/components/ui/icons'

import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import { validateProjectDraft } from '@/lib/projects/validation'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalCost?: number  // 项目总费用（CNY）
  stats?: ProjectStats
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const PAGE_SIZE = 7 // 加上新建项目按钮正好8个，4列布局下2行
const DEFAULT_BILLING_CURRENCY = 'CNY'

function formatProjectCost(amount: number, currency = DEFAULT_BILLING_CURRENCY): string {
  if (currency === 'USD') return `$${amount.toFixed(2)}`
  return `¥${amount.toFixed(2)}`
}

function toProjectValidationMessage(
  issue: ReturnType<typeof validateProjectDraft>,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (!issue) return null

  switch (issue.code) {
    case 'PROJECT_NAME_REQUIRED':
      return t('validation.nameRequired')
    case 'PROJECT_NAME_TOO_LONG':
      return t('validation.nameTooLong')
    case 'PROJECT_DESCRIPTION_TOO_LONG':
      return t('validation.descriptionTooLong')
  }

  return null
}

export default function WorkspacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  })
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // 分页和搜索状态
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const t = useTranslations('workspace')
  const tc = useTranslations('common')

  // 检查用户是否已登录
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
  }, [session, status, router])

  // 获取项目列表
  const fetchProjects = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString()
      })
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await apiFetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setPagination(data.pagination)
      }
    } catch (error) {
      _ulogError('获取项目失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载和搜索/分页变化时重新获取
  useEffect(() => {
    if (session) {
      fetchProjects(pagination.page, searchQuery)
    }
  }, [session, pagination.page, searchQuery, fetchProjects])

  // 搜索处理
  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 打开新建项目弹窗并检测模型配置
  const openCreateModal = useCallback(() => {
    setCreateError(null)
    setShowCreateModal(true)
  }, [])

  // 分页处理
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationMessage = toProjectValidationMessage(validateProjectDraft(formData), t)
    if (validationMessage) {
      setCreateError(validationMessage)
      return
    }

    setCreateError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // 创建成功后刷新第一页
        setSearchQuery('')
        setSearchInput('')
        setPagination(prev => ({ ...prev, page: 1 }))
        void fetchProjects(1, '')
        setShowCreateModal(false)
        setFormData({ name: '', description: '' })
      } else {
        setCreateError(await readApiErrorMessage(response, t('createFailed')))
      }
    } catch (error) {
      _ulogError('创建项目失败:', error)
      setCreateError(error instanceof Error ? error.message : t('createFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return beijingTime.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    })
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    const validationMessage = toProjectValidationMessage(validateProjectDraft(editFormData), t)
    if (validationMessage) {
      setEditError(validationMessage)
      return
    }

    setEditError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(projects.map(p => p.id === editingProject.id ? data.project : p))
        setShowEditModal(false)
        setEditingProject(null)
        setEditFormData({ name: '', description: '' })
      } else {
        setEditError(await readApiErrorMessage(response, t('updateFailed')))
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : t('updateFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setDeletingProjectId(projectToDelete.id)
    setShowDeleteConfirm(false)

    try {
      const response = await apiFetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 删除成功后重新获取当前页
        fetchProjects(pagination.page, searchQuery)
      } else {
        alert(t('deleteFailed'))
      }
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  const openDeleteConfirm = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setEditingProject(project)
    setEditError(null)
    setEditFormData({
      name: project.name,
      description: project.description || ''
    })
    setShowEditModal(true)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--wuhu-bg-primary)]">
        <div className="text-white/70">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--wuhu-bg-primary)]">
      {/* Header - 统一导航栏 */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            <p className="text-white/70">{t('subtitle')}</p>
          </div>

          {/* 搜索框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('searchPlaceholder')}
              className="w-64 px-3 py-2 bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
            />
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-4 py-2 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(167,87,255,0.6)] transition-all"
            >
              {t('searchButton')}
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white/70 px-4 py-2 rounded-xl hover:border-[var(--wuhu-neon-purple)]/60 transition-all"
              >
                {t('clearButton')}
              </button>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* New Project Card */}
          <div
            onClick={() => openCreateModal()}
            className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-xl p-6 cursor-pointer group flex items-center justify-center hover:shadow-[0_0_40px_rgba(167,87,255,0.3)] hover:border-[var(--wuhu-neon-purple)]/60 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] flex items-center justify-center shadow-lg shadow-[rgba(167,87,255,0.3)] group-hover:shadow-[0_0_20px_rgba(167,87,255,0.5)] group-hover:scale-110 transition-all duration-300">
                <AppIcon name="plus" className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{t('newProject')}</span>
            </div>
          </div>

          {/* Project Cards */}
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-white/10 rounded mb-3"></div>
                <div className="h-3 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
              </div>
            ))
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={{ pathname: `/workspace/${project.id}` }}
                className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-xl cursor-pointer relative group block hover:shadow-[0_0_40px_rgba(167,87,255,0.3)] hover:border-[var(--wuhu-neon-purple)]/60 transition-all duration-300 overflow-hidden"
              >
                {/* 悬停光效 */}
                <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-[var(--wuhu-neon-purple)]/10 to-[var(--wuhu-neon-pink)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="p-5 relative z-10">
                  {/* 操作按钮 */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={(e) => openEditModal(project, e)}
                      className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 p-2 rounded-lg transition-colors hover:border-[var(--wuhu-neon-purple)]/60"
                      title={t('editProject')}
                    >
                      <AppIcon name="editSquare" className="w-4 h-4 text-white/70" />
                    </button>
                    <button
                      onClick={(e) => openDeleteConfirm(project, e)}
                      className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 p-2 rounded-lg transition-colors hover:border-[var(--wuhu-neon-pink)]/60"
                      title={t('deleteProject')}
                      disabled={deletingProjectId === project.id}
                    >
                      {deletingProjectId === project.id ? (
                        <TaskStatusInline
                          state={resolveTaskPresentationState({
                            phase: 'processing',
                            intent: 'process',
                            resource: 'text',
                            hasOutput: true,
                          })}
                          className="[&>span]:sr-only"
                        />
                      ) : (
                        <AppIcon name="trash" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />
                      )}
                    </button>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 pr-20 group-hover:text-[var(--wuhu-neon-pink)] transition-colors">
                    {project.name}
                  </h3>

                  {/* 描述：优先用户描述，fallback 到第一集故事 */}
                  {(project.description || project.stats?.firstEpisodePreview) && (
                    <div className="flex items-start gap-2 mb-4">
                      <AppIcon name="fileText" className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
                        {project.description || project.stats?.firstEpisodePreview}
                      </p>
                    </div>
                  )}

                  {/* 统计信息 - 整行统一渐变 */}
                  {project.stats && (project.stats.episodes > 0 || project.stats.images > 0 || project.stats.videos > 0) ? (
                    <div className="flex items-center gap-2 mb-3">
                      {/* 共享渐变定义 */}
                      <IconGradientDefs className="w-0 h-0 absolute" aria-hidden="true" />
                      <AppIcon name="statsBarGradient" className="w-4 h-4 flex-shrink-0" />
                      <div className="flex items-center gap-3 text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        {project.stats.episodes > 0 && (
                          <span className="flex items-center gap-1" title={t('statsEpisodes')}>
                            <AppIcon name="statsEpisodeGradient" className="w-3.5 h-3.5" />
                            {project.stats.episodes}
                          </span>
                        )}
                        {project.stats.images > 0 && (
                          <span className="flex items-center gap-1" title={t('statsImages')}>
                            <AppIcon name="statsImageGradient" className="w-3.5 h-3.5" />
                            {project.stats.images}
                          </span>
                        )}
                        {project.stats.videos > 0 && (
                          <span className="flex items-center gap-1" title={t('statsVideos')}>
                            <AppIcon name="statsVideoGradient" className="w-3.5 h-3.5" />
                            {project.stats.videos}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mb-3">
                      <AppIcon name="statsBar" className="w-4 h-4 text-white/50 flex-shrink-0" />
                      <span className="text-xs text-white/50">{t('noContent')}</span>
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <div className="flex items-center gap-1">
                      <AppIcon name="clock" className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    {project.totalCost !== undefined && project.totalCost > 0 && (
                      <span className="text-[11px] font-mono font-medium text-[rgba(255,255,255,0.7)]">
                        {formatProjectCost(project.totalCost)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AppIcon name="folderCards" className="w-8 h-8 text-white/50" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? t('noResults') : t('noProjects')}
            </h3>
            <p className="text-white/70 mb-6">
              {searchQuery ? t('noResultsDesc') : t('noProjectsDesc')}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openCreateModal()}
                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-6 py-3 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(167,87,255,0.6)] transition-all"
              >
                {t('newProject')}
              </button>
            )}
          </div>
        )}

        {/* 分页控件 */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--wuhu-neon-purple)]/60 transition-all"
            >
              <AppIcon name="chevronLeft" className="w-5 h-5" />
            </button>

            {/* 页码按钮 */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => {
                // 显示第一页、最后一页、当前页及其前后两页
                return page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 2
              })
              .map((page, index, array) => (
                <span key={page} className="flex items-center">
                  {/* 显示省略号 */}
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-white/50">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-xl transition-all ${page === pagination.page
                      ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)]'
                      : 'bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white hover:border-[var(--wuhu-neon-purple)]/60'
                      }`}
                  >
                    {page}
                  </button>
                </span>
              ))}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--wuhu-neon-purple)]/60 transition-all"
            >
              <AppIcon name="chevronRight" className="w-5 h-5" />
            </button>

            <span className="ml-4 text-sm text-white/50">
              {t('totalProjects', { count: pagination.total })}
            </span>
          </div>
        )}
      </main>

      {/* Create Project Modal - 简化版，只有名称和描述 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--wuhu-bg-card)]/95 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.2)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">{t('createProject')}</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-2 text-white/70 font-medium">
                  {t('projectName')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="block mb-2 text-white/70 font-medium">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {createError && (
                <p className="mb-4 rounded-xl border border-[var(--wuhu-neon-pink)]/30 bg-[var(--wuhu-neon-pink)]/10 px-3 py-2 text-sm text-[var(--wuhu-neon-pink)]">
                  {createError}
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError(null)
                    setFormData({ name: '', description: '' })
                  }}
                  className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white px-4 py-2 rounded-xl hover:border-[var(--wuhu-neon-purple)]/60 transition-all"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-4 py-2 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(167,87,255,0.6)] transition-all disabled:opacity-50"
                  disabled={createLoading || !formData.name.trim()}
                >
                  {createLoading ? t('creating') : t('createProject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--wuhu-bg-card)]/95 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.2)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">{t('editProject')}</h2>
            <form onSubmit={handleEditProject}>
              <div className="mb-4">
                <label htmlFor="edit-name" className="block mb-2 text-white/70 font-medium">
                  {t('projectName')} *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="edit-description" className="block mb-2 text-white/70 font-medium">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, description: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {editError && (
                <p className="mb-4 rounded-xl border border-[var(--wuhu-neon-pink)]/30 bg-[var(--wuhu-neon-pink)]/10 px-3 py-2 text-sm text-[var(--wuhu-neon-pink)]">
                  {editError}
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    setEditError(null)
                    setEditFormData({ name: '', description: '' })
                  }}
                  className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 text-white px-4 py-2 rounded-xl hover:border-[var(--wuhu-neon-purple)]/60 transition-all"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-4 py-2 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(167,87,255,0.6)] transition-all disabled:opacity-50"
                  disabled={createLoading || !editFormData.name.trim()}
                >
                  {createLoading ? t('saving') : tc('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={showDeleteConfirm}
        title={t('deleteProject')}
        message={t('deleteConfirm', { name: projectToDelete?.name || '' })}
        confirmText={tc('delete')}
        cancelText={tc('cancel')}
        type="danger"
        onConfirm={handleDeleteProject}
        onCancel={cancelDelete}
      />
    </div>
  )
}
