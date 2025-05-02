import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check, Plus, Trash2, List, Calendar, Clock, Bell, Filter, X, Settings, Moon, Sun, Tag, Repeat, BarChart2, Folder, ChevronRight, Inbox, LayoutGrid, Timer, LogOut } from "lucide-react";
import { AuthProvider, useAuth } from './AuthContext';
import { auth, signOut, db } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import Login from './Login';

const EnhancedTodoApp = () => {
  const { currentUser } = useAuth();
  
  // States
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [priority, setPriority] = useState("medium");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [animation, setAnimation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalData, setTaskModalData] = useState({
    text: "",
    priority: "medium",
    pomodoroTime: 25,
    dueDate: "",
    remindTime: "",
    tags: [],
    recurrenceType: "none",
    recurrenceEnd: ""
  });
  
  // New states for enhanced features
  const [selectedProject, setSelectedProject] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusTimer, setFocusTimer] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    dailyTasks: [],
    focusSessions: [],
    streaks: 0,
    topTags: []
  });
  // Add missing state variables
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [projectView, setProjectView] = useState('list');
  
  // Refs
  const newTaskInputRef = useRef(null);
  const editInputRef = useRef(null);
  const timerRef = useRef(null);

  // Theme colors based on light/dark mode
  const theme = darkMode ? {
    primary: "#3b82f6",
    background: "#111827",
    cardBg: "#1f2937",
    textPrimary: "#f9fafb",
    textSecondary: "#9ca3af",
    border: "#374151",
    input: "#1f2937"
  } : {
    primary: "#2563eb",
    background: "#f3f4f6",
    cardBg: "#ffffff",
    textPrimary: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    input: "#f9fafb"
  };

  // Priority colors
  const priorityColors = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#10b981"
  };

  // Handle timer completion
  const handleTimerComplete = () => {
    setAnalyticsData(prev => ({
      ...prev,
      focusSessions: [...prev.focusSessions, {
        date: new Date().toISOString(),
        duration: 25
      }]
    }));
    
    if (Notification.permission === "granted") {
      new Notification("Focus Session Complete!", {
        body: "Time for a short break!",
        icon: "/favicon.ico"
      });
    }
  };

  // All useEffect hooks at the top level
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setTasks(userData.tasks || []);
            setProjects(userData.projects || []);
            setTags(userData.tags || []);
            setAnalyticsData(userData.analytics || {
              dailyTasks: [],
              focusSessions: [],
              streaks: 0,
              topTags: []
            });
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    loadUserData();
  }, [currentUser]);

  useEffect(() => {
    const saveUserData = async () => {
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            tasks,
            projects,
            tags,
            analytics: analyticsData,
            lastUpdated: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error saving user data:', error);
        }
      }
    };
    saveUserData();
  }, [tasks, projects, tags, analyticsData, currentUser]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Focus timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setFocusTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            handleTimerComplete();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  // Handle Pomodoro timer for tasks
  useEffect(() => {
    const runningTasks = tasks.filter(task => task.isPomodoroRunning);
    if (runningTasks.length > 0) {
      timerRef.current = setInterval(() => {
        setTasks(prevTasks => prevTasks.map(task => {
          if (task.isPomodoroRunning && task.pomodoroTime > 0) {
            const newTime = task.pomodoroTime - 1;
            if (newTime === 0) {
              return {
                ...task,
                pomodoroTime: task.pomodoroTime,
                isPomodoroRunning: false,
                pomodoroCompleted: (task.pomodoroCompleted || 0) + 1
              };
            }
            return { ...task, pomodoroTime: newTime };
          }
          return task;
        }));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [tasks]);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("projects", JSON.stringify(projects));
    localStorage.setItem("tags", JSON.stringify(tags));
    localStorage.setItem("analytics", JSON.stringify(analyticsData));
  }, [tasks, projects, tags, analyticsData]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Save data
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("projects", JSON.stringify(projects));
    localStorage.setItem("tags", JSON.stringify(tags));
    localStorage.setItem("analytics", JSON.stringify(analyticsData));
  }, [tasks, projects, tags, analyticsData]);

  if (!currentUser) {
    return (
      <div style={{ 
        minHeight: "100vh",
        backgroundColor: theme.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Login isOpen={true} onClose={() => {}} />
      </div>
    );
  }

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle focus mode
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
    if (!focusMode) {
      setFocusTimer(25 * 60);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      clearInterval(timerRef.current);
    }
  };

  // Add new project
  const addProject = (title, description = "", parentId = null) => {
    const newProject = {
      id: Date.now(),
      title,
      description,
      parentId,
      tasks: [],
      subprojects: [],
      color: generateProjectColor(),
      createdAt: new Date().toISOString(),
      icon: 'folder' // Default icon
    };
    
    if (parentId) {
      setProjects(projects.map(project => 
        project.id === parentId 
          ? { ...project, subprojects: [...project.subprojects, newProject.id] }
          : project
      ));
    }
    
    setProjects([...projects, newProject]);
  };

  // Generate project color
  const generateProjectColor = () => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Toggle project expand
  const toggleProjectExpand = (projectId) => {
    setExpandedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  // Get project hierarchy
  const getProjectHierarchy = (projectId = null) => {
    return projects
      .filter(p => p.parentId === projectId)
      .map(p => ({
        ...p,
        subprojects: getProjectHierarchy(p.id)
      }));
  };

  // Move project
  const moveProject = (projectId, newParentId) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        return { ...project, parentId: newParentId };
      }
      if (project.subprojects.includes(projectId)) {
        return {
          ...project,
          subprojects: project.subprojects.filter(id => id !== projectId)
        };
      }
      if (project.id === newParentId) {
        return {
          ...project,
          subprojects: [...project.subprojects, projectId]
        };
      }
      return project;
    }));
  };

  // Add new tag
  const addTag = (tagName) => {
    if (!tags.includes(tagName)) {
      setTags([...tags, tagName]);
    }
  };

  // Adding a task with enhanced features
  const addTask = () => {
    if (!newTask.trim()) return;
    
    const newTaskObj = { 
      id: Date.now(), 
      text: newTask, 
      completed: false,
      priority: priority,
      dueDate: dueDate,
      remindTime: remindTime,
      createdAt: new Date().toISOString(),
      projectId: selectedProject,
      tags: selectedTags,
      subtasks: [],
      recurrence: recurrenceType !== "none" ? {
        type: recurrenceType,
        end: recurrenceEnd
      } : null
    };
    
    setTasks([...tasks, newTaskObj]);
    
    // Update project if task belongs to one
    if (selectedProject) {
      setProjects(projects.map(project => 
        project.id === selectedProject 
          ? { ...project, tasks: [...project.tasks, newTaskObj.id] }
          : project
      ));
    }
    
    // Reset form
    setNewTask("");
    setPriority("medium");
    setDueDate("");
    setRemindTime("");
    setSelectedTags([]);
    setRecurrenceType("none");
    setRecurrenceEnd("");
    setShowAddPanel(false);
    
    // Trigger add animation
    newTaskObj.isNew = true;
    setTimeout(() => {
      setTasks(prev => prev.map(task => task.id === newTaskObj.id ? { ...task, isNew: false } : task));
    }, 500);
  };

  // Toggle task completion
  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? 
      { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null } : 
      task
    ));
    
    // Close confirmation dialog if open
    setShowConfirmDelete(null);
  };

  // Delete task
  const deleteTask = (id) => {
    // If confirmation is shown for this task, proceed with deletion
    if (showConfirmDelete === id) {
      // Apply delete animation
      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, isDeleting: true } : task
      ));
      
      // Remove after animation completes
      setTimeout(() => {
        setTasks(tasks.filter(task => task.id !== id));
      }, 300);
      
      setShowConfirmDelete(null);
    } else {
      // Show confirmation dialog
      setShowConfirmDelete(id);
      // Auto hide after 3 seconds
      setTimeout(() => {
        setShowConfirmDelete(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  // Start editing a task
  const startEditTask = (task) => {
    setEditingTask(task.id);
    setEditText(task.text);
  };

  // Save edited task
  const saveEditTask = () => {
    if (!editText.trim()) return;
    
    setTasks(tasks.map(task => 
      task.id === editingTask ? 
      { ...task, text: editText } : 
      task
    ));
    
    setEditingTask(null);
  };

  // Handle keypress in edit input
  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEditTask();
    } else if (e.key === 'Escape') {
      setEditingTask(null);
    }
  };

  // Handle drag start
  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  // Handle drag over
  const handleDragOver = (e, columnType) => {
    e.preventDefault();
    setDragOverColumn(columnType);
  };

  // Handle drop
  const handleDrop = (e, columnType) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Update task status based on drop column
    setTasks(tasks.map(task => 
      task.id === draggedTask.id ? 
      { 
        ...task, 
        completed: columnType === 'completed' 
      } : 
      task
    ));
    
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Filter tasks based on current filter settings and search text
  const getFilteredTasks = (status) => {
    return tasks.filter(task => {
      // Filter by completion status
      if (status === 'pending' && task.completed) return false;
      if (status === 'completed' && !task.completed) return false;
      
      // Filter by selected filter status
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && task.completed) return false;
        if (filterStatus === 'completed' && !task.completed) return false;
      }
      
      // Filter by priority
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      
      // Filter by search text
      if (searchText && !task.text.toLowerCase().includes(searchText.toLowerCase())) return false;
      
      return true;
    });
  };

  // Get human-readable date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Determine if a task is due soon (within 2 days)
  const isDueSoon = (dateStr) => {
    if (!dateStr) return false;
    
    const dueDate = new Date(dateStr);
    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    
    return dueDate <= twoDaysLater && dueDate >= today;
  };

  // Is task overdue
  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    
    const dueDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setSearchText('');
    setShowFilters(false);
  };

  // ProjectSelector Component
  const ProjectSelector = () => {
    const renderProject = (project, level = 0) => {
      const isExpanded = expandedProjects.includes(project.id);
      const hasSubprojects = project.subprojects.length > 0;
      
      return (
        <div key={project.id}>
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px",
              paddingLeft: `${level * 20 + 6}px`,
              borderRadius: "6px",
              backgroundColor: selectedProject === project.id ? `${project.color}20` : "transparent",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={() => setSelectedProject(project.id)}
          >
            {hasSubprojects && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleProjectExpand(project.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSecondary,
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  transform: isExpanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s"
                }}
              >
                <ChevronRight size={16} />
              </button>
            )}
            <Folder size={16} color={project.color} />
            <span style={{ 
              color: theme.textPrimary,
              fontSize: "14px",
              fontWeight: selectedProject === project.id ? "500" : "normal"
            }}>
              {project.title}
            </span>
            <span style={{ 
              marginLeft: "auto",
              color: theme.textSecondary,
              fontSize: "12px"
            }}>
              {tasks.filter(t => t.projectId === project.id).length}
            </span>
          </div>
          
          {isExpanded && project.subprojects.map(subprojectId => {
            const subproject = projects.find(p => p.id === subprojectId);
            return subproject && renderProject(subproject, level + 1);
          })}
        </div>
      );
    };

    return (
      <div style={{
        maxWidth: "1200px",
        margin: "16px auto 0",
        padding: "0 16px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px"
        }}>
          <h3 style={{ 
            fontSize: "14px", 
            color: theme.textSecondary,
            fontWeight: "500"
          }}>
            Projects
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setProjectView(prev => prev === 'list' ? 'board' : 'list')}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSecondary,
                cursor: "pointer",
                padding: "4px",
                display: "flex"
              }}
              title={projectView === 'list' ? "Switch to board view" : "Switch to list view"}
            >
              {projectView === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
            <button
              onClick={() => {
                const title = prompt("Enter project title:");
                if (title) {
                  const description = prompt("Enter project description (optional):");
                  const parentId = selectedProject;
                  addProject(title, description, parentId);
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSecondary,
                cursor: "pointer",
                padding: "4px",
                display: "flex"
              }}
              title="Add new project"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        
        <div style={{
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{ padding: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px",
                borderRadius: "6px",
                backgroundColor: selectedProject === null ? `${theme.primary}20` : "transparent",
                cursor: "pointer",
                marginBottom: "4px"
              }}
              onClick={() => setSelectedProject(null)}
            >
              <Inbox size={16} color={theme.primary} />
              <span style={{ 
                color: theme.textPrimary,
                fontSize: "14px",
                fontWeight: selectedProject === null ? "500" : "normal"
              }}>
                All Tasks
              </span>
              <span style={{ 
                marginLeft: "auto",
                color: theme.textSecondary,
                fontSize: "12px"
              }}>
                {tasks.length}
              </span>
            </div>
            
            {getProjectHierarchy().map(project => renderProject(project))}
          </div>
        </div>
      </div>
    );
  };

  // Add new task with modal
  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTaskModalData({
      text: newTask,
      priority: "medium",
      pomodoroTime: 25,
      dueDate: "",
      remindTime: "",
      tags: [],
      recurrenceType: "none",
      recurrenceEnd: ""
    });
    setShowTaskModal(true);
  };

  // Save task from modal
  const saveTaskFromModal = () => {
    const newTaskObj = {
      id: Date.now(),
      text: taskModalData.text,
      completed: false,
      priority: taskModalData.priority,
      dueDate: taskModalData.dueDate,
      remindTime: taskModalData.remindTime,
      createdAt: new Date().toISOString(),
      projectId: selectedProject,
      tags: taskModalData.tags,
      subtasks: [],
      recurrence: taskModalData.recurrenceType !== "none" ? {
        type: taskModalData.recurrenceType,
        end: taskModalData.recurrenceEnd
      } : null,
      pomodoroTime: taskModalData.pomodoroTime * 60, // Convert to seconds
      pomodoroCompleted: 0,
      isPomodoroRunning: false
    };

    setTasks([...tasks, newTaskObj]);
    setNewTask("");
    setShowTaskModal(false);
  };

  // Toggle Pomodoro for a specific task
  const toggleTaskPomodoro = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const isRunning = !task.isPomodoroRunning;
        return {
          ...task,
          isPomodoroRunning: isRunning,
          pomodoroTime: isRunning ? task.pomodoroTime : task.pomodoroTime
        };
      }
      return task;
    }));
  };

  return (
    <div 
      style={{ 
        minHeight: "100vh",
        backgroundColor: theme.background,
        transition: "background-color 0.3s ease",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        width: "100%",
        padding: 0,
        margin: 0
      }}
    >
      {/* Task Modal */}
      {showTaskModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            <h2 style={{ color: theme.textPrimary, marginBottom: "20px" }}>Add New Task</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: theme.textSecondary, display: "block", marginBottom: "8px" }}>
                Task Description
              </label>
              <input
                type="text"
                value={taskModalData.text}
                onChange={(e) => setTaskModalData({ ...taskModalData, text: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.input,
                  color: theme.textPrimary
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: theme.textSecondary, display: "block", marginBottom: "8px" }}>
                Priority
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["low", "medium", "high"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setTaskModalData({ ...taskModalData, priority: p })}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: `1px solid ${priorityColors[p]}`,
                      backgroundColor: taskModalData.priority === p ? `${priorityColors[p]}20` : "transparent",
                      color: taskModalData.priority === p ? priorityColors[p] : theme.textSecondary,
                      cursor: "pointer"
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: theme.textSecondary, display: "block", marginBottom: "8px" }}>
                Pomodoro Time (minutes)
              </label>
              <input
                type="number"
                value={taskModalData.pomodoroTime}
                onChange={(e) => setTaskModalData({ ...taskModalData, pomodoroTime: parseInt(e.target.value) || 25 })}
                min="1"
                max="60"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.input,
                  color: theme.textPrimary
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: theme.textSecondary, display: "block", marginBottom: "8px" }}>
                Due Date
              </label>
              <input
                type="date"
                value={taskModalData.dueDate}
                onChange={(e) => setTaskModalData({ ...taskModalData, dueDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.input,
                  color: theme.textPrimary
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: theme.textSecondary, display: "block", marginBottom: "8px" }}>
                Reminder Time
              </label>
              <input
                type="time"
                value={taskModalData.remindTime}
                onChange={(e) => setTaskModalData({ ...taskModalData, remindTime: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.input,
                  color: theme.textPrimary
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowTaskModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: "transparent",
                  color: theme.textSecondary,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveTaskFromModal}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: theme.primary,
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      <header 
        style={{ 
          padding: "32px 0 20px 0",
          background: theme.cardBg,
          color: theme.textPrimary,
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          transition: "background-color 0.3s ease, color 0.3s ease",
          position: "sticky",
          top: 0,
          zIndex: 10,
          marginBottom: "16px"
        }}
      >
        <div 
          style={{ 
            maxWidth: "1200px", 
            margin: "0 auto", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "0 24px"
          }}
        >
          <h1 
            style={{ 
              fontSize: "24px", 
              fontWeight: "bold", 
              display: "flex", 
              alignItems: "center",
              gap: "8px"
            }}
          >
            <List color={theme.primary} />
            TaskFlow
          </h1>
          
          <div style={{ display: "flex", gap: "12px" }}>
            {/* Add logout button */}
            <button 
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSecondary,
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Logout"
            >
              <LogOut size={20} />
            </button>

            {/* Existing buttons */}
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                background: showAnalytics ? `${theme.primary}20` : "transparent",
                border: "none",
                color: showAnalytics ? theme.primary : theme.textSecondary,
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="View Analytics"
            >
              <BarChart2 size={20} />
            </button>

            <button 
              onClick={toggleFocusMode}
              style={{
                background: focusMode ? `${theme.primary}20` : "transparent",
                border: "none",
                color: focusMode ? theme.primary : theme.textSecondary,
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            >
              <Timer size={20} />
            </button>

            <button 
              onClick={toggleDarkMode}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSecondary,
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: showFilters ? `${theme.primary}20` : "transparent",
                border: "none",
                color: showFilters ? theme.primary : theme.textSecondary,
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}
              title="Filter tasks"
            >
              <Filter size={20} />
              
              {(filterStatus !== 'all' || filterPriority !== 'all' || searchText) && (
                <span 
                  style={{ 
                    position: "absolute", 
                    top: "2px", 
                    right: "2px", 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    backgroundColor: theme.primary 
                  }} 
                />
              )}
            </button>
          </div>
        </div>
        
        {/* Project Selector */}
        <ProjectSelector />

        {/* Focus Mode Overlay */}
        {focusMode && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.background,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: theme.textPrimary,
                marginBottom: "20px"
              }}
            >
              {formatTime(focusTimer)}
            </div>
            
            <div
              style={{
                fontSize: "24px",
                color: theme.textSecondary,
                marginBottom: "40px"
              }}
            >
              {newTask || "Focus Time"}
            </div>
            
            <button
              onClick={toggleFocusMode}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: theme.primary,
                color: "white",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              End Session
            </button>
          </div>
        )}

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div
            style={{
              maxWidth: "1200px",
              margin: "16px auto 0",
              padding: "20px",
              backgroundColor: theme.cardBg,
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", color: theme.textPrimary }}>Analytics Dashboard</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSecondary,
                  cursor: "pointer"
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              {/* Task Completion Stats */}
              <div style={{ padding: "20px", backgroundColor: `${theme.primary}10`, borderRadius: "8px" }}>
                <h3 style={{ fontSize: "16px", color: theme.textPrimary, marginBottom: "10px" }}>Task Completion</h3>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: theme.primary }}>
                  {tasks.filter(t => t.completed).length}/{tasks.length}
                </div>
                <div style={{ fontSize: "14px", color: theme.textSecondary }}>
                  {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}% Complete
                </div>
              </div>

              {/* Focus Sessions */}
              <div style={{ padding: "20px", backgroundColor: `${priorityColors.medium}10`, borderRadius: "8px" }}>
                <h3 style={{ fontSize: "16px", color: theme.textPrimary, marginBottom: "10px" }}>Focus Sessions</h3>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: priorityColors.medium }}>
                  {analyticsData.focusSessions.length}
                </div>
                <div style={{ fontSize: "14px", color: theme.textSecondary }}>
                  Total Sessions
                </div>
              </div>

              {/* Streak */}
              <div style={{ padding: "20px", backgroundColor: `${priorityColors.low}10`, borderRadius: "8px" }}>
                <h3 style={{ fontSize: "16px", color: theme.textPrimary, marginBottom: "10px" }}>Current Streak</h3>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: priorityColors.low }}>
                  {analyticsData.streaks}
                </div>
                <div style={{ fontSize: "14px", color: theme.textSecondary }}>
                  Days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && (
          <div 
            style={{
              maxWidth: "1200px",
              margin: "16px auto 0",
              padding: "16px",
              backgroundColor: theme.cardBg,
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              animation: animation ? "fadeIn 0.3s ease" : "none",
              transition: "background-color 0.3s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "500", color: theme.textPrimary }}>Filter Tasks</h3>
              <button 
                onClick={() => setShowFilters(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSecondary,
                  cursor: "pointer",
                  display: "flex"
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search tasks..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.input,
                    color: theme.textPrimary,
                    fontSize: "14px",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: "14px", color: theme.textSecondary, display: "block", marginBottom: "4px" }}>
                    Status
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setFilterStatus("all")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: filterStatus === "all" ? theme.primary : theme.cardBg,
                        color: filterStatus === "all" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus("pending")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: filterStatus === "pending" ? theme.primary : theme.cardBg,
                        color: filterStatus === "pending" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setFilterStatus("completed")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: filterStatus === "completed" ? theme.primary : theme.cardBg,
                        color: filterStatus === "completed" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Completed
                    </button>
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: "14px", color: theme.textSecondary, display: "block", marginBottom: "4px" }}>
                    Priority
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setFilterPriority("all")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: filterPriority === "all" ? theme.primary : theme.cardBg,
                        color: filterPriority === "all" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterPriority("high")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${priorityColors.high}`,
                        backgroundColor: filterPriority === "high" ? priorityColors.high : theme.cardBg,
                        color: filterPriority === "high" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      High
                    </button>
                    <button
                      onClick={() => setFilterPriority("medium")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${priorityColors.medium}`,
                        backgroundColor: filterPriority === "medium" ? priorityColors.medium : theme.cardBg,
                        color: filterPriority === "medium" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => setFilterPriority("low")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${priorityColors.low}`,
                        backgroundColor: filterPriority === "low" ? priorityColors.low : theme.cardBg,
                        color: filterPriority === "low" ? "white" : theme.textPrimary,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Low
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={resetFilters}
                  style={{
                    marginLeft: "auto",
                    alignSelf: "flex-end",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.cardBg,
                    color: theme.textSecondary,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <X size={14} />
                  Reset filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Task input area */}
        <div 
          style={{
            maxWidth: "1200px",
            margin: "24px auto 0",
            position: "relative",
            padding: "0 24px"
          }}
        >
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              padding: showAddPanel ? "16px 16px 8px" : "12px 16px",
              borderRadius: "8px",
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`,
              boxShadow: isInputFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "none",
              transition: "all 0.3s ease",
              marginBottom: showAddPanel ? "0" : "8px"
            }}
          >
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                width: "100%" 
              }}
            >
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                style={{
                  background: theme.primary,
                  color: "white",
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                  transform: showAddPanel ? "rotate(45deg)" : "rotate(0deg)"
                }}
              >
                <Plus size={20} />
              </button>
              
              <input
                ref={newTaskInputRef}
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new task..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  color: theme.textPrimary,
                  fontSize: "15px",
                  padding: "8px 0",
                  outline: "none",
                  transition: "color 0.3s ease"
                }}
              />
              
              {newTask && (
                <button
                  onClick={handleAddTask}
                  style={{
                    background: theme.primary,
                    color: "white",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  Add Task
                </button>
              )}
            </div>
          </div>
          
          {/* Expanded Add Panel */}
          {showAddPanel && (
            <div 
              style={{
                padding: "0 16px 16px",
                borderRadius: "0 0 8px 8px",
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderTop: "none",
                marginBottom: "16px",
                animation: animation ? "slideDown 0.3s ease" : "none",
                transition: "background-color 0.3s ease, border-color 0.3s ease"
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start" }}>
                {/* Priority Selection */}
                <div style={{ minWidth: "200px", flex: 1 }}>
                  <label style={{ fontSize: "13px", color: theme.textSecondary, display: "block", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setPriority("low")}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: `1px solid ${priority === "low" ? priorityColors.low : theme.border}`,
                        backgroundColor: priority === "low" ? `${priorityColors.low}20` : "transparent",
                        color: priority === "low" ? priorityColors.low : theme.textSecondary,
                        fontSize: "13px",
                        fontWeight: priority === "low" ? "500" : "normal",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Low
                    </button>
                    <button
                      onClick={() => setPriority("medium")}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: `1px solid ${priority === "medium" ? priorityColors.medium : theme.border}`,
                        backgroundColor: priority === "medium" ? `${priorityColors.medium}20` : "transparent",
                        color: priority === "medium" ? priorityColors.medium : theme.textSecondary,
                        fontSize: "13px",
                        fontWeight: priority === "medium" ? "500" : "normal",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => setPriority("high")}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: `1px solid ${priority === "high" ? priorityColors.high : theme.border}`,
                        backgroundColor: priority === "high" ? `${priorityColors.high}20` : "transparent",
                        color: priority === "high" ? priorityColors.high : theme.textSecondary,
                        fontSize: "13px",
                        fontWeight: priority === "high" ? "500" : "normal",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      High
                    </button>
                  </div>
                </div>

                {/* Tags Input */}
                <div style={{ minWidth: "200px", flex: 1 }}>
                  <label style={{ fontSize: "13px", color: theme.textSecondary, display: "block", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Tag size={14} />
                      Tags
                    </div>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: `${theme.primary}20`,
                          color: theme.primary,
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex"
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newTag = e.target.value.trim();
                          if (!selectedTags.includes(newTag)) {
                            setSelectedTags([...selectedTags, newTag]);
                            addTag(newTag);
                          }
                          e.target.value = '';
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.input,
                        color: theme.textPrimary,
                        fontSize: "12px",
                        width: "100px"
                      }}
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div style={{ minWidth: "200px", flex: 1 }}>
                  <label style={{ fontSize: "13px", color: theme.textSecondary, display: "block", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={14} />
                      Due Date
                    </div>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "4px",
                      border: `1px solid ${theme.border}`,
                      backgroundColor: "transparent",
                      color: theme.textPrimary,
                      fontSize: "14px",
                      width: "100%",
                      cursor: "pointer",
                      transition: "border-color 0.2s, color 0.3s ease"
                    }}
                  />
                </div>

                {/* Reminder Time */}
                <div style={{ minWidth: "200px", flex: 1 }}>
                  <label style={{ fontSize: "13px", color: theme.textSecondary, display: "block", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={14} />
                      Reminder Time
                    </div>
                  </label>
                  <input
                    type="time"
                    value={remindTime}
                    onChange={(e) => setRemindTime(e.target.value)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "4px",
                      border: `1px solid ${theme.border}`,
                      backgroundColor: "transparent",
                      color: theme.textPrimary,
                      fontSize: "14px",
                      width: "100%",
                      cursor: "pointer",
                      transition: "border-color 0.2s, color 0.3s ease"
                    }}
                  />
                </div>

                {/* Recurrence */}
                <div style={{ minWidth: "200px", flex: 1 }}>
                  <label style={{ fontSize: "13px", color: theme.textSecondary, display: "block", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Repeat size={14} />
                      Recurrence
                    </div>
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        backgroundColor: "transparent",
                        color: theme.textPrimary,
                        fontSize: "14px",
                        flex: 1,
                        cursor: "pointer"
                      }}
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    
                    {recurrenceType !== "none" && (
                      <input
                        type="date"
                        value={recurrenceEnd}
                        onChange={(e) => setRecurrenceEnd(e.target.value)}
                        placeholder="End date"
                        style={{
                          padding: "7px 12px",
                          borderRadius: "4px",
                          border: `1px solid ${theme.border}`,
                          backgroundColor: "transparent",
                          color: theme.textPrimary,
                          fontSize: "14px",
                          flex: 1,
                          cursor: "pointer"
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Task columns */}
      <main 
        style={{ 
          maxWidth: "1200px", 
          margin: "0 auto",
          padding: "0 24px 32px 24px", 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
          gap: "32px"
        }}
      >
        {/* Pending Tasks */}
        <div 
          style={{ 
            borderRadius: "14px",
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            transition: "background-color 0.3s ease, border-color 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: "350px",
            maxHeight: "60vh"
          }}
          onDragOver={(e) => handleDragOver(e, 'pending')}
          onDrop={(e) => handleDrop(e, 'pending')}
          className={dragOverColumn === 'pending' ? 'drag-over' : ''}
        >
          <div 
            style={{ 
              padding: "20px 24px 16px 24px", 
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <h2 
              style={{ 
                fontSize: "16px", 
                fontWeight: "600", 
                color: theme.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <List color={theme.primary} />
              Pending Tasks
              <span 
                style={{ 
                  fontSize: "14px", 
                  color: theme.textSecondary, 
                  fontWeight: "normal", 
                  marginLeft: "2px" 
                }}
              >
                ({getFilteredTasks('pending').length})
              </span>
            </h2>
          </div>
          
          <ul 
            style={{ 
              listStyle: "none", 
              padding: "20px 24px 0 24px", 
              margin: 0,
              minHeight: "200px"
            }}
          >
            {getFilteredTasks('pending').map((task) => (
              <li 
                key={task.id} 
                style={{ 
                  margin: "0 auto 18px auto",
                  opacity: task.isDeleting ? 0 : 1,
                  transform: task.isNew && animation ? "translateY(-10px)" : "translateY(0)",
                  transition: animation ? "opacity 0.3s ease, transform 0.3s ease" : "none",
                  width: "95%",
                  maxWidth: 420,
                  minWidth: 0
                }}
                draggable
                onDragStart={() => handleDragStart(task)}
              >
                <div 
                  style={{ 
                    borderRadius: "14px",
                    background: darkMode ? "#181b20" : "#fcfcfd",
                    border: `1px solid ${theme.border}`,
                    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.03)",
                    padding: "18px 20px 14px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    width: "90%",
                    maxWidth: "100%",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = darkMode ? "0 4px 16px rgba(59,130,246,0.10)" : "0 4px 16px rgba(59,130,246,0.08)"}
                  onMouseOut={e => e.currentTarget.style.boxShadow = darkMode ? "0 2px 8px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.03)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button 
                      onClick={() => toggleTask(task.id)}
                      style={{ 
                        width: "22px", 
                        height: "22px", 
                        borderRadius: "6px", 
                        border: `1.5px solid ${theme.border}`,
                        background: "none",
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: "8px",
                        marginTop: "2px",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "background 0.2s, border-color 0.2s"
                      }}
                    >
                      {task.completed && <Check size={16} color={theme.primary} />}
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 18, color: theme.textPrimary }}>{task.text}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {task.pomodoroTime && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: theme.input, color: theme.textSecondary, borderRadius: 7, padding: "2px 10px", fontSize: 13, fontWeight: 500
                      }}>
                        <Timer size={14} style={{ opacity: 0.7 }} /> {formatTime(task.pomodoroTime)}
                      </span>
                    )}
                    {task.dueDate && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: theme.input, color: theme.textSecondary, borderRadius: 7, padding: "2px 10px", fontSize: 13, fontWeight: 500
                      }}>
                        <Calendar size={14} style={{ opacity: 0.7 }} /> {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.remindTime && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: theme.input, color: theme.textSecondary, borderRadius: 7, padding: "2px 10px", fontSize: 13, fontWeight: 500
                      }}>
                        <Bell size={14} style={{ opacity: 0.7 }} /> {task.remindTime}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: 8, alignItems: "center" }}>
                    <span style={{
                      background: task.priority === "high" ? "#fee2e2" : task.priority === "medium" ? "#fef9c3" : "#dcfce7",
                      color: task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#10b981",
                      borderRadius: 12, padding: "4px 16px", fontWeight: 600, fontSize: 14
                    }}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                    <button 
                      onClick={() => startEditTask(task)}
                      style={{ 
                        background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", borderRadius: 6, padding: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.background = theme.input}
                      onMouseOut={e => e.currentTarget.style.background = "none"}
                      title="Edit task"
                    >
                      <Settings size={20} />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      style={{ 
                        background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", borderRadius: 6, padding: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.background = theme.input}
                      onMouseOut={e => e.currentTarget.style.background = "none"}
                      title="Delete task"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Completed Tasks */}
        <div 
          style={{ 
            borderRadius: "14px",
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            transition: "background-color 0.3s ease, border-color 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: "350px",
            maxHeight: "60vh"
          }}
          onDragOver={(e) => handleDragOver(e, 'completed')}
          onDrop={(e) => handleDrop(e, 'completed')}
          className={dragOverColumn === 'completed' ? 'drag-over' : ''}
        >
          <div 
            style={{ 
              padding: "20px 24px 16px 24px", 
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <h2 
              style={{ 
                fontSize: "16px", 
                fontWeight: "600", 
                color: theme.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Check color="#10b981" />
              Completed Tasks
              <span 
                style={{ 
                  fontSize: "14px", 
                  color: theme.textSecondary, 
                  fontWeight: "normal", 
                  marginLeft: "2px" 
                }}
              >
                ({getFilteredTasks('completed').length})
              </span>
            </h2>
          </div>
          
          <ul 
            style={{ 
              listStyle: "none", 
              padding: "20px 24px 0 24px", 
              margin: 0,
              minHeight: "200px"
            }}
          >
            {getFilteredTasks('completed').map((task) => (
              <li 
                key={task.id} 
                style={{ 
                  marginBottom: "12px",
                  opacity: task.isDeleting ? 0 : 0.8,
                  transform: task.isNew && animation ? "translateY(-10px)" : "translateY(0)",
                  transition: animation ? "all 0.3s ease" : "none"
                }}
                draggable
                onDragStart={() => handleDragStart(task)}
              >
                <div 
                  style={{ 
                    padding: "14px 16px",
                    borderRadius: "8px",
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", paddingLeft: "4px" }}>
                    <button 
                      onClick={() => toggleTask(task.id)}
                      style={{ 
                        width: "20px", 
                        height: "20px", 
                        borderRadius: "4px", 
                        border: `1px solid #10b981`,
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: "12px",
                        marginTop: "2px",
                        backgroundColor: "#10b981",
                        color: "white",
                        flexShrink: 0,
                        cursor: "pointer"
                      }}
                    >
                      <Check size={14} />
                    </button>
                    
                    <div 
                      style={{ 
                        flex: 1,
                        display: "flex", 
                        flexDirection: "column"
                      }}
                    >
                      <span 
                        style={{ 
                          fontSize: "14px",
                          color: theme.textSecondary,
                          textDecoration: "line-through",
                          wordBreak: "break-word"
                        }}
                      >
                        {task.text}
                      </span>
                      
                      {/* Completion time */}
                      <span 
                        style={{ 
                          fontSize: "12px",
                          color: theme.textSecondary,
                          marginTop: "4px"
                        }}
                      >
                        Completed {task.completedAt ? new Date(task.completedAt).toLocaleString() : 'recently'}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => deleteTask(task.id)}
                      style={{ 
                        color: showConfirmDelete === task.id ? priorityColors.high : theme.textSecondary, 
                        background: showConfirmDelete === task.id ? `${priorityColors.high}15` : "none", 
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        padding: "4px",
                        borderRadius: "4px",
                        transition: "color 0.2s, background-color 0.2s"
                      }}
                      title={showConfirmDelete === task.id ? "Click again to confirm deletion" : "Delete task"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Analytics Dashboard */}
        <div 
          style={{ 
            borderRadius: "14px",
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            transition: "background-color 0.3s ease, border-color 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            overflow: "auto",
            minHeight: "350px",
            padding: "24px"
          }}
        >
          <div 
            style={{ 
              padding: "16px", 
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <h2 
              style={{ 
                fontSize: "16px", 
                fontWeight: "600", 
                color: theme.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Settings color={theme.primary} />
              Statistics
            </h2>
          </div>
          
          <div style={{ padding: "16px" }}>
            {/* Task stats */}
            <div style={{ 
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px"
            }}>
              <div 
                style={{ 
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: `${theme.primary}10`,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "4px" }}>
                  Total Tasks
                </div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: theme.primary }}>
                  {tasks.length}
                </div>
              </div>
              
              <div 
                style={{ 
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: `${priorityColors.low}10`,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "4px" }}>
                  Completed
                </div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: priorityColors.low }}>
                  {tasks.filter(t => t.completed).length}
                </div>
              </div>
              
              <div 
                style={{ 
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: `${priorityColors.medium}10`,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "4px" }}>
                  Pending
                </div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: priorityColors.medium }}>
                  {tasks.filter(t => !t.completed).length}
                </div>
              </div>
              
              <div 
                style={{ 
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: `${priorityColors.high}10`,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "4px" }}>
                  High Priority
                </div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: priorityColors.high }}>
                  {tasks.filter(t => t.priority === "high").length}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", color: theme.textPrimary }}>
                  Completion Rate
                </div>
                <div style={{ fontSize: "14px", color: theme.textPrimary, fontWeight: "500" }}>
                  {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                </div>
              </div>
              
              <div 
                style={{ 
                  height: "8px", 
                  backgroundColor: `${theme.textSecondary}20`,
                  borderRadius: "4px",
                  overflow: "hidden"
                }}
              >
                <div 
                  style={{ 
                    height: "100%", 
                    width: `${tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0}%`,
                    backgroundColor: theme.primary,
                    borderRadius: "4px",
                    transition: "width 1s ease"
                  }}
                />
              </div>
            </div>
            
            {/* Priority breakdown */}
            <div>
              <div style={{ fontSize: "14px", color: theme.textPrimary, marginBottom: "12px" }}>
                Priority Breakdown
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", color: priorityColors.high }}>High</div>
                    <div style={{ fontSize: "13px", color: theme.textSecondary }}>
                      {tasks.filter(t => t.priority === "high").length} tasks
                    </div>
                  </div>
                  
                  <div 
                    style={{ 
                      height: "6px", 
                      backgroundColor: `${priorityColors.high}20`,
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}
                  >
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${tasks.length > 0 ? (tasks.filter(t => t.priority === "high").length / tasks.length) * 100 : 0}%`,
                        backgroundColor: priorityColors.high,
                        borderRadius: "3px",
                        transition: "width 1s ease"
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", color: priorityColors.medium }}>Medium</div>
                    <div style={{ fontSize: "13px", color: theme.textSecondary }}>
                      {tasks.filter(t => t.priority === "medium").length} tasks
                    </div>
                  </div>
                  <div 
                    style={{ 
                      height: "6px", 
                      backgroundColor: `${priorityColors.medium}20`,
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}
                  >
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${tasks.length > 0 ? (tasks.filter(t => t.priority === "medium").length / tasks.length) * 100 : 0}%`,
                        backgroundColor: priorityColors.medium,
                        borderRadius: "3px",
                        transition: "width 1s ease"
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", color: priorityColors.low }}>Low</div>
                    <div style={{ fontSize: "13px", color: theme.textSecondary }}>
                      {tasks.filter(t => t.priority === "low").length} tasks
                    </div>
                  </div>
                  <div 
                    style={{ 
                      height: "6px", 
                      backgroundColor: `${priorityColors.low}20`,
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}
                  >
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${tasks.length > 0 ? (tasks.filter(t => t.priority === "low").length / tasks.length) * 100 : 0}%`,
                        backgroundColor: priorityColors.low,
                        borderRadius: "3px",
                        transition: "width 1s ease"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* CSS for animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          body {
            margin: 0;
            transition: background-color 0.3s ease;
          }
          
          body.dark {
            background-color: #111827;
          }
          
          .drag-over {
            box-shadow: 0 0 0 2px #3b82f6, 0 4px 6px rgba(0,0,0,0.1) !important;
          }
          /* Add hover effect for cards */
          div[style*='box-shadow'] {
            transition: box-shadow 0.2s;
          }
          div[style*='box-shadow']:hover {
            box-shadow: 0 4px 16px rgba(59,130,246,0.10);
          }
        `}
      </style>
    </div>
  );
};

// Wrap the app with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <EnhancedTodoApp />
    </AuthProvider>
  );
};

export default App;