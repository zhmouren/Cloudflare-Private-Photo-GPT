import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface Media {
  key: string;
  url: string;
  type: 'image' | 'video';
  timestamp: number;
  width?: number;
  height?: number;
  size: number;
}

// 工具函数
function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('___');
}

// 判断文件类型
function getMediaType(key: string): 'image' | 'video' | null {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
  
  const ext = key.split('.').pop()?.toLowerCase() || '';
  
  if (imageExtensions.includes(ext)) {
    return 'image';
  }
  
  if (videoExtensions.includes(ext)) {
    return 'video';
  }
  
  return null;
}

// 样式常量
const buttonBaseClass = "h-12 px-6 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
const buttonPrimaryClass = `${buttonBaseClass} bg-gradient-to-r from-blue-500 to-teal-400 hover:from-teal-500 hover:to-blue-400 text-white hover:shadow-lg hover:scale-105`;
const buttonSecondaryClass = `${buttonBaseClass} bg-white/90 backdrop-blur-sm border border-white/50 hover:border-teal-400 hover:bg-teal-50/80`;
const buttonDangerClass = `${buttonBaseClass} bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-500 hover:to-red-400 text-white hover:shadow-lg hover:scale-105`;
const buttonGuestClass = `${buttonBaseClass} bg-gradient-to-r from-purple-500 to-indigo-400 hover:from-indigo-500 hover:to-purple-400 text-white hover:shadow-lg hover:scale-105`;

const inputBaseClass = "h-12 px-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-base transition-all w-full";

// 装饰性元素组件
const FloatingElements: React.FC = () => {
  return (
    <>
      <div className="fixed top-1/4 left-10 w-24 h-24 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed bottom-1/3 right-20 w-32 h-32 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed top-1/3 right-1/3 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-emerald-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed top-20 right-1/4 w-0 h-0 border-l-[15px] border-l-transparent border-b-[25px] border-b-cyan-300 border-r-[15px] border-r-transparent opacity-20 animate-bounce"></div>
      <div className="fixed bottom-40 left-1/4 w-8 h-8 bg-teal-300 rotate-45 opacity-20 animate-bounce"></div>
    </>
  );
};

// 统计信息卡片组件
const StatsCard: React.FC<{ title: string; value: number | string; icon: string }> = ({ title, value, icon }) => {
  return (
    <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-4 shadow-lg hover:scale-105 transition-all duration-300">
      <div className="flex items-center">
        <span className="text-2xl mr-2">{icon}</span>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

// 自适应图片组件 - 根据实际比例显示
const AdaptiveImage: React.FC<{
  src: string;
  alt: string;
  onLoad: () => void;
  onError: () => void;
  className?: string;
}> = ({ src, alt, onLoad, onError, className = '' }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 创建一个隐藏的图片来获取尺寸信息
    const img = new Image();
    img.onload = () => {
      setAspectRatio(img.naturalHeight / img.naturalWidth);
      onLoad();
    };
    img.onerror = onError;
    img.src = src;
  }, [src, onLoad, onError]);

  // 如果已知比例，使用padding-top技巧保持比例
  if (aspectRatio !== null) {
    return (
      <div 
        className="relative w-full overflow-hidden"
        style={{ 
          paddingBottom: `${aspectRatio * 100}%`,
          maxHeight: '500px' // 限制最大高度防止过长图片
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  // 否则显示加载状态
  return (
    <div className="relative w-full overflow-hidden" style={{ paddingBottom: '75%' }}>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-pulse">
        <div className="text-2xl text-gray-500">📷</div>
      </div>
    </div>
  );
};

// 单个媒体卡片组件
const MediaCard: React.FC<{
  media: Media;
  idx: number;
  onPreview: () => void;
  onDownload: () => void;
  selected: boolean;
  onSelect: () => void;
  isSelectMode: boolean;
  isGuest: boolean; // 添加访客模式参数
}> = React.memo(({ media, idx, onPreview, onDownload, selected, onSelect, isSelectMode, isGuest }) => {
  const [loaded, setLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取缩略图URL
  const getThumbnailUrl = (url: string) => {
    return `${url}?width=600&quality=80&fit=scale-down`;
  };

  // 获取预览图URL
  const getPreviewUrl = (url: string) => {
    return `${url}?width=1200&quality=85&fit=scale-down`;
  };

  return (
    <div
      ref={containerRef}
      className="mb-6 break-inside-avoid cursor-zoom-in group animate-float"
      style={{ animationDelay: `${idx * 0.1}s` }}
      onClick={isSelectMode ? onSelect : onPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`backdrop-blur-lg border rounded-2xl shadow-lg 
        overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1 relative ${
          selected 
            ? 'border-teal-500 bg-teal-50/70' 
            : 'border-white/30 bg-white/70'
        }`}>
        {isSelectMode && !isGuest && ( // 访客模式下不显示选择框
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected 
                ? 'bg-teal-500 border-teal-500' 
                : 'bg-white/80 border-white/50'
            }`}>
              {selected && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </div>
          </div>
        )}
        
        {media.type === 'image' ? (
          <AdaptiveImage
            src={getThumbnailUrl(media.url)}
            alt={media.key}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 rounded-full p-4 backdrop-blur-sm">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute top-3 left-12">
          <span className="bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold">
            {media.type === 'image' ? '📷' : '🎬'}
          </span>
        </div>
        
        <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 flex items-end p-4 ${
          isHovered ? 'opacity-100' : ''
        }`}>
          <span className="text-white text-sm font-medium truncate">
            {media.key.split('/').pop()}
          </span>
        </div>
        
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg hover:bg-teal-100 transition-colors"
            onClick={e => { e.stopPropagation(); onDownload(); }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 13l6 6 6-6M10 3v16"/>
            </svg>
          </button>
        </div>
        <div className="px-3 py-2 bg-white/80 backdrop-blur-sm">
          <span className="text-sm text-gray-600 truncate block">{media.key.split('/').pop()}</span>
        </div>
      </div>
    </div>
  );
});

// 主应用组件
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // 添加访客状态
  const [username, setUsername] = useState(''); // 添加用户名状态
  const [password, setPassword] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPath, setUploadPath] = useState('');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); // 增加每页显示数量
  const [gradientPosition, setGradientPosition] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // 动态背景效果
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientPosition(prev => (prev + 1) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const getDynamicGradient = () => {
    const speed = 0.5;
    const pos = (gradientPosition * speed) % 360;
    const pos2 = (pos + 120) % 360;
    const pos3 = (pos + 240) % 360;
    
    return {
      background: `linear-gradient(135deg, 
        hsl(${pos}, 60%, 70%) 0%, 
        hsl(${pos2}, 65%, 65%) 50%, 
        hsl(${pos3}, 60%, 70%) 100%)`,
      transition: 'background 0.3s ease'
    };
  };

  // 计算分页数据
  const indexOfLastMedia = currentPage * itemsPerPage;
  const indexOfFirstMedia = indexOfLastMedia - itemsPerPage;
  
  const filteredMedia = media
    .filter(m => m.key.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
  
  const currentMedia = filteredMedia.slice(indexOfFirstMedia, indexOfLastMedia);
  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);

  // API 调用
  const loadMedia = async (pwd?: string, usrname?: string) => {
    const headers: Record<string, string> = {};
    
    // 如果提供了用户名和密码，则添加到请求头
    if (pwd && usrname) {
      headers['x-password'] = pwd;
      headers['x-username'] = usrname;
    }
    
    const res = await fetch('/api/list', {
      headers
    });
    
    if (res.status === 401) {
      setIsLoggedIn(false);
      setIsGuest(false);
      setPassword('');
      setUsername('');
      alert('用户名或密码错误');
      return false;
    }
    
    if (res.status === 429) {
      alert('请求过于频繁，请稍后再试');
      return false;
    }
    
    const data = await res.json();
    
    const mediaList: Media[] = data
      .map((obj: any) => {
        const type = getMediaType(obj.key);
        if (!type) return null;
        
        const timestamp = obj.uploaded ? new Date(obj.uploaded).getTime() : Date.now();
        
        return {
          key: obj.key,
          url: `/r2/${encodeKey(obj.key)}`,
          type,
          timestamp,
          width: obj.width || null,
          height: obj.height || null,
          size: obj.size || 0
        };
      })
      .filter(Boolean) as Media[];
    
    setMedia(mediaList);
    setCurrentPage(1);
    return true;
  };

  const handleLogin = async () => {
    if (!username) {
      alert('请输入用户名');
      return;
    }
    if (!password) {
      alert('请输入密码');
      return;
    }
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const success = await loadMedia(password, username);
          if (success) {
            setIsLoggedIn(true);
            setIsGuest(false);
          }
        }
      } else if (response.status === 401) {
        alert('用户名或密码错误');
      } else if (response.status === 429) {
        alert('请求过于频繁，请稍后再试');
      } else {
        alert('登录失败，请重试');
      }
    } catch (error) {
      alert('登录失败，请重试');
    }
  };

  const handleGuestLogin = async () => {
    const success = await loadMedia();
    if (success) {
      setIsGuest(true);
      setIsLoggedIn(false);
    }
  };

  const handleUpload = async () => {
    // 访客模式下不能上传
    if (isGuest) {
      alert('访客模式下无法上传文件，请登录后操作');
      return;
    }
    
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('path', uploadPath);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
        headers: { 
          'x-password': password,
          'x-username': username
        }
      });
      
      if (res.status === 401) {
        alert('用户名或密码已失效，请重新登录');
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        return;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return;
      }
      
      // 处理存储空间不足或文件过大错误
      if (res.status === 400) {
        const text = await res.text();
        alert(text);
        return;
      }
      
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await loadMedia(password, username);
    } catch (error) {
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (mediaItem: Media) => {
    const a = document.createElement('a');
    a.href = mediaItem.url;
    a.download = mediaItem.key.split('/').pop() || 
      (mediaItem.type === 'image' ? 'image.jpg' : 'video.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBatchDownload = async () => {
    setDownloading(true);
    try {
      for (const mediaItem of media) {
        await new Promise(res => setTimeout(res, 200));
        handleDownload(mediaItem);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (mediaKey: string) => {
    // 访客模式下不能删除
    if (isGuest) {
      alert('访客模式下无法删除文件，请登录后操作');
      return;
    }
    
    if (!window.confirm('确定要删除这个文件吗？')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/upload`, {
        method: 'DELETE',
        headers: { 
          'x-password': password,
          'x-username': username,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: mediaKey })
      });
      
      if (res.status === 401) {
        alert('用户名或密码已失效，请重新登录');
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        return;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return;
      }
      
      if (!res.ok) {
        throw new Error('删除失败');
      }
      
      setMedia(prev => prev.filter(m => m.key !== mediaKey));
      setSelectedMedia(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaKey);
        return newSet;
      });
      
      alert('删除成功');
    } catch (error) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    // 访客模式下不能批量删除
    if (isGuest) {
      alert('访客模式下无法删除文件，请登录后操作');
      return;
    }
    
    if (selectedMedia.size === 0) {
      alert('请先选择要删除的文件');
      return;
    }
    
    if (!window.confirm(`确定要删除选中的 ${selectedMedia.size} 个文件吗？`)) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/upload`, {
        method: 'DELETE',
        headers: { 
          'x-password': password,
          'x-username': username,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keys: Array.from(selectedMedia) })
      });
      
      if (res.status === 401) {
        alert('用户名或密码已失效，请重新登录');
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        return;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return;
      }
      
      if (!res.ok) {
        throw new Error('删除失败');
      }
      
      setMedia(prev => prev.filter(m => !selectedMedia.has(m.key)));
      setSelectedMedia(new Set());
      setIsSelectMode(false);
      
      alert('删除成功');
    } catch (error) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMediaSelection = (key: string) => {
    // 访客模式下不能选择文件
    if (isGuest) {
      alert('访客模式下无法选择文件，请登录后操作');
      return;
    }
    
    setSelectedMedia(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    // 访客模式下不能全选
    if (isGuest) {
      alert('访客模式下无法选择文件，请登录后操作');
      return;
    }
    
    if (selectedMedia.size === currentMedia.length) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(currentMedia.map(m => m.key)));
    }
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // 登录页面渲染
  if (!isLoggedIn && !isGuest) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-cyan-400 via-emerald-300 to-teal-300" 
           style={getDynamicGradient()}>
        <FloatingElements />
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl shadow-2xl p-10 w-80 flex flex-col gap-6 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400 drop-shadow">Flow Album</h2>
            <p className="text-gray-600 mb-6">私人云媒体库</p>
          </div>
          <input
            type="text"
            className="border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white/80 text-lg"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !password && document.querySelector<HTMLInputElement>('.password-input')?.focus()}
          />
          <input
            type="password"
            className="border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white/80 text-lg password-input"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleLogin()}
          />
          <button
            className={`${buttonPrimaryClass} bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-emerald-500 hover:to-teal-400`}
            onClick={handleLogin}
          >
            登录
          </button>
          
          <div className="relative flex items-center justify-center my-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">或者</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <button
            className={buttonGuestClass}
            onClick={handleGuestLogin}
          >
            访客浏览
          </button>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2025 Flow Album</p>
          </div>
        </div>
      </div>
    );
  }

  // 主界面渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-emerald-200 to-teal-300"
         style={getDynamicGradient()}>
      <FloatingElements />
      
      <nav className="w-full backdrop-blur-2xl bg-white/40 border-b border-white/30 shadow-lg flex items-center justify-between px-8 py-4 mb-8 sticky top-0 z-20">
        <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
          Flow Album
        </span>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索媒体..."
              className="px-4 py-2 rounded-full bg-white/80 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm w-48 transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button className={`${buttonSecondaryClass} bg-teal-50/80`} onClick={() => { 
            setIsLoggedIn(false); 
            setIsGuest(false);
            setPassword(''); 
            setUsername(''); 
          }}>
            {isGuest ? '返回登录' : '退出'}
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto mb-6 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard title="总媒体数" value={media.length} icon="📁" />
          <StatsCard title="图片数" value={media.filter(m => m.type === 'image').length} icon="📷" />
          <StatsCard title="视频数" value={media.filter(m => m.type === 'video').length} icon="🎬" />
          <StatsCard title="当前页" value={currentPage} icon="📄" />
          
          <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">排序</span>
              <select 
                className="bg-white/80 border border-white/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
              >
                <option value="newest">最新</option>
                <option value="oldest">最旧</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 仅在登录状态下显示上传功能 */}
      {!isGuest && (
        <div className="max-w-6xl mx-auto mb-8 backdrop-blur-2xl bg-white/60 border border-white/30 rounded-3xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
            <input
              type="text"
              className={inputBaseClass}
              placeholder="上传路径（可选）"
              value={uploadPath}
              onChange={e => setUploadPath(e.target.value)}
            />
            
            <div className="relative">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <button
                className={`${inputBaseClass} text-left overflow-hidden`}
                onClick={() => inputRef.current?.click()}
              >
                {file ? (
                  <span className="truncate block">{file.name}</span>
                ) : (
                  <span className="text-gray-500">未选择任何文件</span>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-3 justify-end">
              <button
                className={buttonPrimaryClass}
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    上传中...
                  </span>
                ) : '上传'}
              </button>
              <button
                className={buttonPrimaryClass}
                onClick={handleBatchDownload}
                disabled={downloading || media.length === 0}
              >
                {downloading ? '打包中...' : '打包下载'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 仅在登录状态下显示选择模式 */}
      {!isGuest && isSelectMode && (
        <div className="fixed bottom-8 right-8 z-30 backdrop-blur-lg bg-white/80 border border-white/50 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              已选择 {selectedMedia.size} 项
            </span>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsSelectMode(false)}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              className={buttonSecondaryClass}
              onClick={toggleSelectAll}
            >
              {selectedMedia.size === currentMedia.length 
                ? '取消全选' 
                : '全选当前页'}
            </button>
            
            <button
              className={buttonDangerClass}
              onClick={handleBatchDelete}
              disabled={deleting || selectedMedia.size === 0}
            >
              {deleting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  删除中...
                </span>
              ) : (
                `删除选中 (${selectedMedia.size})`
              )}
            </button>
          </div>
        </div>
      )}

      {/* 仅在登录状态下显示选择模式切换按钮 */}
      {!isGuest && (
        <button
          className={`fixed bottom-8 left-8 z-30 ${buttonSecondaryClass} ${
            isSelectMode 
              ? 'bg-teal-500 text-white border-teal-500' 
              : 'bg-white/90'
          } rounded-full p-4 shadow-xl`}
          onClick={() => setIsSelectMode(!isSelectMode)}
          title={isSelectMode ? '退出选择模式' : '进入选择模式'}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSelectMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            )}
          </svg>
        </button>
      )}

      <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 px-4">
        {currentMedia.map((mediaItem, idx) => (
          <MediaCard
            key={mediaItem.key}
            media={mediaItem}
            idx={idx}
            onPreview={() => setPreviewIdx(indexOfFirstMedia + idx)}
            onDownload={() => handleDownload(mediaItem)}
            selected={selectedMedia.has(mediaItem.key)}
            onSelect={() => toggleMediaSelection(mediaItem.key)}
            isSelectMode={isSelectMode}
            isGuest={isGuest} // 传递访客模式状态
          />
        ))}
      </div>

      {currentMedia.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-12 inline-block">
            <div className="text-5xl mb-4">📁</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">没有找到媒体文件</h3>
            <p className="text-gray-500">
              {searchTerm ? '尝试使用其他关键词搜索' : '上传一些图片或视频开始使用吧'}
            </p>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-xl ${
                currentPage === 1 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (
                pageNum === 1 || 
                pageNum === totalPages || 
                (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={`w-10 h-10 rounded-xl ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white'
                        : 'bg-white/80 hover:bg-white text-gray-700'
                    }`}
                    onClick={() => paginate(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              }
              
              if (
                (pageNum === currentPage - 3 && pageNum > 2) ||
                (pageNum === currentPage + 3 && pageNum < totalPages - 1)
              ) {
                return (
                  <span key={pageNum} className="px-2 py-2 text-gray-500">
                    ...
                  </span>
                );
              }
              
              return null;
            })}
            
            <button
              className={`px-4 py-2 rounded-xl ${
                currentPage === totalPages 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {previewIdx !== null && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50"
          onClick={() => setPreviewIdx(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-between z-10 px-8">
              <button 
                className="bg-white/20 hover:bg-white/40 rounded-full p-4 text-white transition-all transform hover:scale-110"
                onClick={e => {
                  e.stopPropagation();
                  if (previewIdx > 0) setPreviewIdx(previewIdx - 1);
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              
              <button
                className="bg-white/20 hover:bg-white/40 rounded-full p-4 text-white transition-all transform hover:scale-110"
                onClick={e => {
                  e.stopPropagation();
                  if (previewIdx < filteredMedia.length - 1) setPreviewIdx(previewIdx + 1);
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div className="absolute top-8 right-8 flex flex-col gap-4 z-10">
              <button
                className="bg-white/20 hover:bg-white/40 rounded-full p-3 text-white transition-all transform hover:scale-110"
                onClick={e => {
                  e.stopPropagation();
                  handleDownload(filteredMedia[previewIdx]);
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16l8 8 8-8M12 4v20"/>
                </svg>
              </button>
              
              <button
                className="bg-white/20 hover:bg-white/40 rounded-full p-3 text-white transition-all transform hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIdx(null);
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* 仅在登录状态下显示删除按钮 */}
            {!isGuest && (
              <div className="absolute top-8 left-8 z-10">
                <button
                  className="bg-red-500/80 hover:bg-red-500 rounded-full p-3 text-white transition-all transform hover:scale-110 flex items-center"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(filteredMedia[previewIdx].key);
                    setPreviewIdx(null);
                  }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            )}

            <div className="relative max-w-7xl max-h-[85vh] w-auto h-auto flex items-center justify-center">
              {filteredMedia[previewIdx]?.type === 'image' ? (
                <img
                  src={filteredMedia[previewIdx].url}
                  alt="预览"
                  className="max-h-[85vh] max-w-full object-contain"
                  onClick={e => e.stopPropagation()}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <video 
                  controls
                  autoPlay
                  className="max-h-[85vh] max-w-full object-contain"
                  onClick={e => e.stopPropagation()}
                >
                  <source src={filteredMedia[previewIdx].url} type="video/mp4" />
                  您的浏览器不支持视频播放。
                </video>
              )}
            </div>
            
            <div className="absolute bottom-8 left-0 right-0 text-center text-white z-10">
              <p className="font-medium text-lg">{filteredMedia[previewIdx]?.key.split('/').pop()}</p>
              <p className="text-sm text-gray-300 mt-1">
                {previewIdx + 1} / {filteredMedia.length}
              </p>
            </div>
            
            <div className="absolute bottom-24 left-0 right-0 flex gap-4 justify-center z-10">
              {filteredMedia
                .slice(Math.max(0, previewIdx - 2), Math.min(filteredMedia.length, previewIdx + 3))
                .map((mediaItem, i) => {
                  const realIdx = Math.max(0, previewIdx - 2) + i;
                  return (
                    <div 
                      key={mediaItem.key}
                      className={`relative h-16 w-16 rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex-shrink-0 ${
                        realIdx === previewIdx 
                          ? 'border-teal-500 scale-110 shadow-lg' 
                          : 'border-white/60 opacity-70 hover:opacity-100'
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        setPreviewIdx(realIdx);
                      }}
                    >
                      {mediaItem.type === 'image' ? (
                        <img
                          src={`${mediaItem.url}?width=100&quality=70&fit=cover`}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'h-full w-full bg-gray-200 flex items-center justify-center';
                              placeholder.innerHTML = '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="gray"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-black/20 flex items-center justify-center">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0.5 right-0.5">
                        <span className="bg-black/50 text-white text-[8px] rounded-full px-0.5">
                          {mediaItem.type === 'image' ? '📷' : '🎬'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-white/80 text-sm">
        <p>© 2025 Flow Album - 私人云媒体库</p>
        {isGuest && (
          <p className="mt-2 text-xs">访客模式 - 仅可查看和下载</p>
        )}
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;