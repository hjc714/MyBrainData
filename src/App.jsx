import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { 
  Folder, 
  FileText, 
  Video, 
  CheckSquare, 
  Clock, 
  Plus, 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Edit2, 
  Lock, 
  Unlock,
  ChevronRight,
  MoreVertical,
  Calendar,
  Search,
  X,
  Home,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutGrid,
  List,
  Filter
} from 'lucide-react';

// --- Firebase Configuration ---
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdD9iNGnah6Wju99VIe8haltHI5xI5Pi4",
  authDomain: "mybraindata.firebaseapp.com",
  projectId: "mybraindata",
  storageBucket: "mybraindata.firebasestorage.app",
  messagingSenderId: "579167927832",
  appId: "1:579167927832:web:b018249834edc50e6e8d6d"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-brain-app';

// --- Components ---

// 1. Password/Lock Screen Component
const LockScreen = ({ isSetup, onUnlock, onSetup }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSetup) {
      onUnlock(input);
    } else {
      if (input.length < 4) {
        setError('密碼至少需要 4 個字元');
        return;
      }
      onSetup(input);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          {isSetup ? <Lock className="w-8 h-8 text-blue-600" /> : <Unlock className="w-8 h-8 text-blue-600" />}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isSetup ? '請輸入管理密碼' : '設定您的管理密碼'}
        </h2>
        <p className="text-slate-500 mb-6">
          {isSetup ? '解鎖以存取您的個人資料' : '這是您第一次使用，請設定一組密碼'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="輸入密碼"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            {isSetup ? '解鎖' : '設定密碼並進入'}
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. Recursive Folder Tree Component
const FolderTree = ({ categories, parentId, level = 0, currentFolderId, onNavigate, onEdit, onDelete }) => {
  const nodes = categories.filter(c => c.parentId === parentId);
  
  if (nodes.length === 0) return null;

  return (
    <div className={level > 0 ? "ml-3 pl-3 border-l border-slate-200" : ""}>
      {nodes.map(node => {
        const isActive = node.id === currentFolderId;
        const hasChildren = categories.some(c => c.parentId === node.id);
        
        return (
          <div key={node.id}>
             <div 
               className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
               onClick={() => onNavigate(node)}
             >
               <div className="flex items-center gap-2 truncate flex-1">
                 <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 fill-blue-200' : 'text-slate-400'}`} />
                 <span className="truncate">{node.title}</span>
               </div>
               
               {/* Actions visible on hover or active */}
               <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1 hover:bg-blue-200 rounded text-slate-500 hover:text-blue-600">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1 hover:bg-red-100 rounded text-slate-500 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
               </div>
             </div>
             
             {/* Recursive rendering */}
             <FolderTree 
               categories={categories} 
               parentId={node.id} 
               level={level + 1} 
               currentFolderId={currentFolderId}
               onNavigate={onNavigate}
               onEdit={onEdit}
               onDelete={onDelete}
             />
          </div>
        );
      })}
    </div>
  )
}

// 3. Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [hasPassword, setHasPassword] = useState(null);
  const [storedPassword, setStoredPassword] = useState(null);
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: '主頁' }]);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterType, setFilterType] = useState('all'); // 'all', 'text', 'todo', 'video', 'reminder'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('category'); // category | card
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text',
    scheduleDate: '',
    scheduleTime: ''
  });

  // --- Auth & Initial Load ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;

    // 1. Fetch Settings
    const settingsUnsub = onSnapshot(
      doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'),
      (docSnap) => {
        if (docSnap.exists()) {
          setHasPassword(true);
          setStoredPassword(docSnap.data().password);
        } else {
          setHasPassword(false);
        }
        setLoading(false);
      },
      (err) => console.error("Settings fetch error", err)
    );

    // 2. Fetch Categories
    const categoriesQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), orderBy('createdAt', 'asc'));
    const categoriesUnsub = onSnapshot(categoriesQuery, (snapshot) => {
      const cats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(cats);
    }, (err) => console.error(err));

    // 3. Fetch Cards
    const cardsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'cards'), orderBy('createdAt', 'desc'));
    const cardsUnsub = onSnapshot(cardsQuery, (snapshot) => {
      const cds = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCards(cds);
    }, (err) => console.error(err));

    return () => {
      settingsUnsub();
      categoriesUnsub();
      cardsUnsub();
    };
  }, [user]);

  // --- Helpers ---
  const buildBreadcrumbs = (folderId, allCats) => {
    const path = [];
    let currentId = folderId;
    while (currentId) {
      const folder = allCats.find(c => c.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.title });
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    path.unshift({ id: null, name: '主頁' });
    return path;
  };

  // --- Derived State ---
  const currentItems = useMemo(() => {
    let filteredCards = [];

    // 1. Filter by Context (Search or Folder)
    if (searchQuery) {
      filteredCards = cards.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.content && c.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else {
      filteredCards = cards.filter(c => c.categoryId === currentFolderId);
    }

    // 2. Filter by Completed Status
    if (!showCompleted) {
      filteredCards = filteredCards.filter(c => !c.isCompleted);
    }

    // 3. Filter by Type
    if (filterType !== 'all') {
      filteredCards = filteredCards.filter(c => c.type === filterType);
    }

    return { cards: filteredCards };
  }, [cards, currentFolderId, searchQuery, showCompleted, filterType]);

  // --- Handlers ---

  const handleUnlock = (inputPass) => {
    if (inputPass === storedPassword) {
      setIsLocked(false);
    } else {
      alert('密碼錯誤');
    }
  };

  const handleSetupPassword = async (newPass) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { password: newPass })
      .catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { password: newPass });
      });
    setStoredPassword(newPass);
    setIsLocked(false);
  };

  const handleCreate = async () => {
    if (!formData.title) return alert('請輸入標題');
    try {
      if (modalType === 'category') {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), {
          title: formData.title,
          parentId: currentFolderId,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'cards'), {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          categoryId: currentFolderId,
          schedule: formData.scheduleDate && formData.scheduleTime ? `${formData.scheduleDate}T${formData.scheduleTime}` : null,
          isCompleted: false,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (e) {
      console.error(e);
      alert('新增失敗');
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      const collectionName = editingItem.parentId !== undefined ? 'categories' : 'cards';
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, collectionName, editingItem.id);
      
      const updateData = { title: formData.title };
      if (collectionName === 'cards') {
        updateData.content = formData.content;
        updateData.type = formData.type;
        updateData.schedule = formData.scheduleDate && formData.scheduleTime ? `${formData.scheduleDate}T${formData.scheduleTime}` : null;
      }
      await updateDoc(ref, updateData);
      closeModal();
    } catch (e) {
      console.error(e);
      alert('更新失敗');
    }
  };

  const handleDelete = async (item, isFolder) => {
    if (!confirm('確定要刪除嗎？' + (isFolder ? ' 資料夾內的項目也會在邏輯上遺失。' : ''))) return;
    const collectionName = isFolder ? 'categories' : 'cards';
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, item.id));
    if (isFolder && currentFolderId === item.id) {
       handleNavigate({ id: item.parentId }); // Go up
    }
  };

  const handleNavigate = (folder) => {
    setSearchQuery('');
    const targetId = folder ? folder.id : null;
    setCurrentFolderId(targetId);
    setBreadcrumbs(buildBreadcrumbs(targetId, categories));
  };

  const handleBreadcrumbClick = (crumb) => {
    setSearchQuery('');
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(buildBreadcrumbs(crumb.id, categories));
  };

  const toggleTodo = async (card) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cards', card.id), {
      isCompleted: !card.isCompleted
    });
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setModalMode('create');
    setFormData({ title: '', content: '', type: 'text', scheduleDate: '', scheduleTime: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item, isFolder) => {
    setModalType(isFolder ? 'category' : 'card');
    setModalMode('edit');
    setEditingItem(item);
    
    let scheduleDate = '';
    let scheduleTime = '';
    if (item.schedule) {
      scheduleDate = item.schedule.split('T')[0]; 
      scheduleTime = item.schedule.split('T')[1];
    }

    setFormData({
      title: item.title,
      content: item.content || '',
      type: item.type || 'text',
      scheduleDate,
      scheduleTime
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // --- Render Helpers ---
  const getCardIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-red-500" />;
      case 'todo': return <CheckSquare className="w-5 h-5 text-green-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const isOverdue = (scheduleStr) => {
    if (!scheduleStr) return false;
    return new Date(scheduleStr) < new Date();
  };

  const formatSchedule = (scheduleStr) => {
    if (!scheduleStr) return '';
    const date = new Date(scheduleStr);
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- Main Render ---

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">載入中...</div>;

  if (isLocked) {
    return <LockScreen isSetup={hasPassword} onUnlock={handleUnlock} onSetup={handleSetupPassword} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans">
      
      {/* Sidebar: Navigation Tree & Folders */}
      <div className="md:w-72 bg-white border-b md:border-r border-slate-200 flex-shrink-0 flex flex-col h-auto md:h-screen">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MyBrain
          </h1>
          <button onClick={() => setSettingsOpen(true)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋全部..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* New Folder Button (In Sidebar) */}
          <button 
            onClick={() => openCreateModal('category')}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 新增分類資料夾
          </button>
        </div>

        {/* Folder Tree Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
           <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pl-2">導航</div>
           
           {/* Root Item */}
           <div 
             onClick={() => handleNavigate(null)}
             className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${currentFolderId === null ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
           >
             <Home className={`w-4 h-4 ${currentFolderId === null ? 'text-blue-600 fill-blue-200' : 'text-slate-400'}`} />
             <span>主頁 / 全部</span>
           </div>

           {/* Recursive Tree */}
           <FolderTree 
             categories={categories}
             parentId={null}
             currentFolderId={currentFolderId}
             onNavigate={handleNavigate}
             onEdit={(item) => openEditModal(item, true)}
             onDelete={(item) => handleDelete(item, true)}
           />
        </div>
      </div>

      {/* Main Content: Cards & Details */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Breadcrumbs & Toolbar */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1 mr-4 overflow-hidden">
             {/* Breadcrumbs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              {searchQuery ? (
                <span className="text-slate-500 flex items-center gap-1">
                  <Search className="w-4 h-4" /> 搜尋結果
                </span>
              ) : (
                breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <button 
                      onClick={() => handleBreadcrumbClick(crumb)}
                      className={`flex items-center hover:text-blue-600 transition-colors ${idx === breadcrumbs.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                    >
                      {crumb.name}
                    </button>
                    {idx < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* Filter Group (Mobile Dropdown) */}
            <div className="md:hidden ml-auto">
               <select
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value)}
                 className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-20 p-1.5 truncate"
               >
                 <option value="all">全部類型</option>
                 <option value="text">文字</option>
                 <option value="todo">待辦</option>
                 <option value="video">影片</option>
                 <option value="reminder">提醒</option>
               </select>
            </div>

            {/* Filter & View & Show Completed Toggles (Desktop) */}
            <div className="flex items-center gap-2 ml-4 border-l border-slate-300 pl-4">
               
               {/* Type Filter Group (Desktop) */}
               <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 mr-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`p-1.5 rounded-md transition-all ${filterType === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="全部類型"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilterType('text')}
                    className={`p-1.5 rounded-md transition-all ${filterType === 'text' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="僅顯示文字"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilterType('todo')}
                    className={`p-1.5 rounded-md transition-all ${filterType === 'todo' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="僅顯示待辦"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilterType('video')}
                    className={`p-1.5 rounded-md transition-all ${filterType === 'video' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="僅顯示影片"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilterType('reminder')}
                    className={`p-1.5 rounded-md transition-all ${filterType === 'reminder' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="僅顯示提醒"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
               </div>

               {/* View Toggle */}
               <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="卡片檢視"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="列表檢視"
                  >
                    <List className="w-4 h-4" />
                  </button>
               </div>

               {/* Completed Toggle */}
               <button 
                 onClick={() => setShowCompleted(!showCompleted)}
                 className={`flex items-center justify-center p-2 rounded-lg border transition-colors ${showCompleted ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                 title={showCompleted ? "隱藏已完成的待辦事項" : "顯示已完成的待辦事項"}
               >
                 {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
               </button>
            </div>
          </div>
          
          {/* New Data Button (Right Side) */}
          {!searchQuery && (
             <button 
               onClick={() => openCreateModal('card')}
               className="ml-2 flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition hover:shadow-md hidden sm:flex"
             >
               <Plus className="w-4 h-4" /> 新增資料
             </button>
          )}
           {!searchQuery && (
             <button 
               onClick={() => openCreateModal('card')}
               className="ml-2 flex-shrink-0 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition hover:shadow-md sm:hidden"
             >
               <Plus className="w-4 h-4" />
             </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* Cards Section */}
          <div>
             {currentItems.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                   <div className="bg-slate-100 p-4 rounded-full mb-3">
                     <FileText className="w-8 h-8 text-slate-300" />
                   </div>
                   <p>{searchQuery ? '找不到符合的資料' : (showCompleted ? '此分類下尚無資料' : '沒有待辦事項 (已隱藏完成項目)')}</p>
                   {!searchQuery && <p className="text-xs mt-1">點擊右上角按鈕新增資料</p>}
                </div>
             ) : (
               <>
                 {viewMode === 'grid' ? (
                   // --- Grid View ---
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {currentItems.cards.map(card => (
                       <div key={card.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col ${card.isCompleted ? 'opacity-60 bg-slate-50' : 'border-slate-200'}`}>
                          
                          {/* Card Header */}
                          <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-50 rounded-md">
                                {getCardIcon(card.type)}
                              </div>
                              <span className={`font-semibold text-slate-800 line-clamp-1 ${card.isCompleted ? 'line-through text-slate-500' : ''}`}>
                                {card.title}
                              </span>
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => openEditModal(card, false)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                               <button onClick={() => handleDelete(card, false)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="p-4 flex-1 flex flex-col gap-2">
                            {card.type === 'video' && card.content && (
                              <div className="mb-2">
                                 <a 
                                   href={card.content} 
                                   target="_blank" 
                                   rel="noreferrer" 
                                   className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-blue-300 transition-all group"
                                 >
                                   <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                      <Video className="w-5 h-5 text-red-500" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <div className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">點擊開啟影片連結</div>
                                     <div className="text-xs text-slate-400 truncate">{card.content}</div>
                                   </div>
                                   <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                 </a>
                              </div>
                            )}
                            
                            {card.type === 'todo' && (
                              <div 
                                onClick={() => toggleTodo(card)}
                                className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${card.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 bg-white'}`}>
                                  {card.isCompleted && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className={`text-sm ${card.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                  {card.isCompleted ? '已完成' : '點擊標記完成'}
                                </span>
                              </div>
                            )}

                            {(card.type === 'text' || card.type === 'reminder' || card.type === 'todo') && card.content && (
                              <p className={`text-slate-600 text-sm whitespace-pre-wrap line-clamp-4 ${card.type === 'todo' ? 'mt-1 pl-1 border-l-2 border-slate-100' : ''}`}>
                                {card.content}
                              </p>
                            )}
                          </div>

                          {/* Card Footer (Schedule) */}
                          {card.schedule && (
                            <div className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 ${isOverdue(card.schedule) && !card.isCompleted ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {isOverdue(card.schedule) && !card.isCompleted ? '已過期：' : '排程：'} {formatSchedule(card.schedule)}
                            </div>
                          )}
                       </div>
                     ))}
                   </div>
                 ) : (
                   // --- List View ---
                   <div className="flex flex-col gap-2">
                     {currentItems.cards.map(card => (
                       <div key={card.id} className={`bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 hover:shadow-sm transition-all group ${card.isCompleted ? 'opacity-60 bg-slate-50' : ''}`}>
                          {/* Icon */}
                          <div className="p-2 bg-slate-50 rounded-md text-slate-500 flex-shrink-0">
                             {getCardIcon(card.type)}
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0 grid gap-0.5">
                             <div className="flex items-center gap-2">
                                <span className={`font-medium text-slate-700 truncate ${card.isCompleted ? 'line-through text-slate-500' : ''}`}>
                                   {card.title}
                                </span>
                                {card.type === 'todo' && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); toggleTodo(card); }}
                                     className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${card.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 bg-white hover:border-blue-400'}`}
                                   >
                                     {card.isCompleted && <CheckSquare className="w-3 h-3 text-white" />}
                                   </button>
                                )}
                             </div>
                             {(card.content) && (
                               <div className="text-xs text-slate-400 truncate">
                                 {card.type === 'video' ? '點擊連結開啟影片...' : card.content}
                               </div>
                             )}
                          </div>

                          {/* Right Side: Schedule & Actions */}
                          <div className="flex items-center gap-3">
                             {/* Schedule */}
                             {card.schedule && (
                                <div className={`hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-md ${isOverdue(card.schedule) && !card.isCompleted ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                                   <Calendar className="w-3 h-3" />
                                   <span className="hidden md:inline">{formatSchedule(card.schedule)}</span>
                                   {isOverdue(card.schedule) && !card.isCompleted && <span className="md:hidden w-2 h-2 rounded-full bg-red-500"></span>}
                                </div>
                             )}

                             {/* Actions */}
                             <div className="flex items-center gap-1 border-l pl-2 border-slate-100">
                                {card.type === 'video' && card.content && (
                                   <a href={card.content} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="開啟連結">
                                      <ExternalLink className="w-4 h-4" />
                                   </a>
                                )}
                                <button onClick={() => openEditModal(card, false)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="編輯"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(card, false)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="刪除"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </>
             )}
          </div>
          
          <div className="h-20"></div> {/* Spacer */}
        </div>
      </div>

      {/* --- Modals --- */}
      {/* 1. Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {modalMode === 'create' ? '新增' : '編輯'} {modalType === 'category' ? '分類資料夾' : '資料卡'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              {modalType === 'category' && modalMode === 'create' && (
                <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                   新增位置：<span className="font-semibold text-blue-700">{breadcrumbs[breadcrumbs.length -1].name}</span>
                </div>
              )}

              {/* Common: Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">標題</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="輸入名稱..."
                />
              </div>

              {/* Card Specific Fields */}
              {modalType === 'card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">類型</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'text', icon: FileText, label: '文字' },
                        { id: 'todo', icon: CheckSquare, label: '待辦' },
                        { id: 'video', icon: Video, label: '影片' },
                        { id: 'reminder', icon: Clock, label: '提醒' },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFormData({...formData, type: t.id})}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-all ${formData.type === t.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          <t.icon className="w-5 h-5" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {formData.type === 'video' ? '影片網址 (YouTube)' : '內容 / 備註'}
                    </label>
                    <textarea 
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder={formData.type === 'video' ? 'https://www.youtube.com/watch?v=...' : '輸入詳細內容...'}
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> 排程時間 (選填)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                        value={formData.scheduleDate}
                        onChange={e => setFormData({...formData, scheduleDate: e.target.value})}
                      />
                      <input 
                        type="time"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                        value={formData.scheduleTime}
                        onChange={e => setFormData({...formData, scheduleTime: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">取消</button>
              <button 
                onClick={modalMode === 'create' ? handleCreate : handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
              >
                {modalMode === 'create' ? '立即新增' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">設定</h3>
            <div className="space-y-4">
              <button 
                onClick={() => {
                   const newPass = prompt("請輸入新的管理密碼：");
                   if (newPass && newPass.length >= 4) {
                     handleSetupPassword(newPass);
                     alert("密碼已更新");
                   } else if (newPass) {
                     alert("密碼太短");
                   }
                }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium flex items-center justify-between"
              >
                <span>修改管理密碼</span>
                <Lock className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setIsLocked(true)}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium flex items-center justify-between"
              >
                <span>鎖定應用程式</span>
                <Unlock className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setSettingsOpen(false)} className="mt-6 w-full py-2 text-slate-500 hover:text-slate-800">
              關閉
            </button>
          </div>
        </div>
      )}

    </div>
  );
}