import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { playCuteClickSound, playPageTransitionSound } from "../utils/audioHelper";
import {
  getFolders, createFolder, renameFolder, deleteFolder,
  createProject, renameProject, duplicateProject, deleteProject, moveProject
} from "../utils/projectStorage";

// Shared styles
const S = {
  overlay: {
    position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",
    display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,
    animation:"modalFadeIn 0.25s ease forwards"
  },
  modal: {
    background:"rgba(15,15,30,0.92)",border:"1px solid rgba(162,155,254,0.25)",
    borderRadius:"20px",padding:"32px",width:"90%",maxWidth:"440px",
    boxShadow:"0 20px 60px rgba(0,0,0,0.7)",animation:"dialogSlideUp 0.35s ease forwards"
  },
  input: {
    width:"100%",padding:"14px 18px",background:"rgba(0,0,0,0.35)",
    border:"1px solid rgba(108,92,231,0.25)",borderRadius:"12px",color:"#fff",
    fontSize:"0.95rem",outline:"none",boxSizing:"border-box",transition:"all 0.2s"
  },
  btnPrimary: {
    padding:"14px 28px",background:"linear-gradient(135deg,#6c5ce7,#a29bfe)",
    border:"none",borderRadius:"12px",color:"#fff",fontWeight:"800",fontSize:"1rem",
    cursor:"pointer",boxShadow:"0 6px 20px rgba(108,92,231,0.4)",transition:"all 0.2s",width:"100%"
  },
  btnDanger: {
    padding:"14px 28px",background:"linear-gradient(135deg,#d63031,#e17055)",
    border:"none",borderRadius:"12px",color:"#fff",fontWeight:"800",fontSize:"1rem",
    cursor:"pointer",transition:"all 0.2s",width:"100%"
  },
  btnGhost: {
    padding:"14px 28px",background:"rgba(255,255,255,0.05)",
    border:"1px solid rgba(255,255,255,0.15)",borderRadius:"12px",color:"#ccc",
    fontWeight:"700",fontSize:"1rem",cursor:"pointer",transition:"all 0.2s",width:"100%"
  },
};

// ── Confirmation Dialog ──
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <p style={{fontSize:"1.05rem",color:"#fff",marginBottom:"24px",lineHeight:1.5,textAlign:"center"}}>{message}</p>
        <div style={{display:"flex",gap:"12px"}}>
          <button style={S.btnGhost} onClick={onCancel}>Cancel</button>
          <button style={S.btnDanger} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Dialog ──
function RenameDialog({ label, initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial);
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{color:"#fff",marginBottom:"16px",fontSize:"1.1rem"}}>✏️ Rename {label}</h3>
        <input style={S.input} value={val} onChange={e=>setVal(e.target.value)} autoFocus
          onKeyDown={e=>{if(e.key==="Enter"&&val.trim())onSave(val.trim())}} />
        <div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
          <button style={S.btnGhost} onClick={onCancel}>Cancel</button>
          <button style={S.btnPrimary} onClick={()=>val.trim()&&onSave(val.trim())}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Move Dialog ──
function MoveDialog({ folders, currentFolderId, onMove, onCancel }) {
  const targets = folders.filter(f=>f.id!==currentFolderId);
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{color:"#fff",marginBottom:"16px",fontSize:"1.1rem"}}>📁 Move to Folder</h3>
        {targets.length===0 ? (
          <p style={{color:"rgba(255,255,255,0.5)",textAlign:"center",padding:"20px"}}>No other folders available. Create a new folder first.</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"8px",maxHeight:"300px",overflowY:"auto"}}>
            {targets.map(f=>(
              <button key={f.id} onClick={()=>onMove(f.id)} style={{
                padding:"14px 18px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"12px",color:"#fff",cursor:"pointer",textAlign:"left",fontSize:"0.92rem",
                fontWeight:"600",transition:"all 0.2s"
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#6c5ce7";e.currentTarget.style.background="rgba(108,92,231,0.1)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.background="rgba(255,255,255,0.04)"}}
              >📁 {f.name}</button>
            ))}
          </div>
        )}
        <button style={{...S.btnGhost,marginTop:"16px"}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── New Project Dialog ──
function NewProjectDialog({ folders, onSelect, onCreate, onCancel }) {
  const [folderName, setFolderName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [mode, setMode] = useState(folders.length > 0 ? "select" : "create");
  const [folderError, setFolderError] = useState("");

  const handleSelectFolder = (fid) => {
    onSelect(fid, projectName);
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      setFolderError("Please enter a folder name.");
      return;
    }
    setFolderError("");
    onCreate(folderName.trim(), projectName);
  };

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{...S.modal,maxWidth:"500px"}} onClick={e=>e.stopPropagation()}>
        <h2 style={{fontSize:"1.5rem",fontWeight:"900",marginBottom:"8px",background:"linear-gradient(135deg,#fff,#a29bfe)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          ➕ New Project
        </h2>
        <p style={{color:"rgba(255,255,255,0.5)",fontSize:"0.88rem",marginBottom:"24px"}}>
          Choose a folder to save your project in, or create a new one, and give it an optional name.
        </p>

        {/* Project Name Input */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
            Project Name (Optional)
          </label>
          <input 
            style={S.input} 
            placeholder="My Room Design..." 
            value={projectName}
            onChange={e => setProjectName(e.target.value)} 
          />
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:"8px",marginBottom:"20px"}}>
          {folders.length>0&&<button onClick={()=>{setMode("select");setFolderError("");}} style={{
            flex:1,padding:"10px",borderRadius:"10px",border:"none",cursor:"pointer",fontWeight:"700",fontSize:"0.85rem",
            background:mode==="select"?"rgba(108,92,231,0.18)":"rgba(255,255,255,0.04)",
            color:mode==="select"?"#a29bfe":"#888",transition:"all 0.2s"
          }}>📂 Existing Folder</button>}
          <button onClick={()=>{setMode("create");setFolderError("");}} style={{
            flex:1,padding:"10px",borderRadius:"10px",border:"none",cursor:"pointer",fontWeight:"700",fontSize:"0.85rem",
            background:mode==="create"?"rgba(108,92,231,0.18)":"rgba(255,255,255,0.04)",
            color:mode==="create"?"#a29bfe":"#888",transition:"all 0.2s"
          }}>✨ New Folder</button>
        </div>
        {mode==="create" ? (
          <div>
            <input style={{...S.input, borderColor: folderError ? "#ff7675" : undefined}} placeholder="Enter folder name..." value={folderName}
              onChange={e=>{setFolderName(e.target.value);if(folderError)setFolderError("");}} autoFocus
              onKeyDown={e=>{if(e.key==="Enter")handleCreateFolder()}} />
            {folderError && (
              <p style={{color:"#ff7675",fontSize:"0.82rem",marginTop:"8px",fontWeight:"600"}}>⚠️ {folderError}</p>
            )}
            <button style={{...S.btnPrimary,marginTop:"16px"}}
              onClick={handleCreateFolder}>Create & Continue →</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"8px",maxHeight:"250px",overflowY:"auto"}}>
            {folders.map(f=>(
              <button key={f.id} onClick={()=>handleSelectFolder(f.id)} style={{
                padding:"16px 18px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:"12px",color:"#fff",cursor:"pointer",textAlign:"left",
                display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.2s"
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#6c5ce7";e.currentTarget.style.background="rgba(108,92,231,0.08)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.background="rgba(255,255,255,0.03)"}}
              >
                <span style={{fontWeight:"700",fontSize:"0.92rem"}}>📁 {f.name}</span>
                <span style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.4)"}}>{f.projects.length} project{f.projects.length!==1?"s":""}</span>
              </button>
            ))}
          </div>
        )}
        <button style={{...S.btnGhost,marginTop:"12px"}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Context Menu ──
function ContextMenu({ x, y, items, onClose }) {
  useEffect(()=>{
    const h=()=>onClose();
    window.addEventListener("click",h);
    return ()=>window.removeEventListener("click",h);
  },[onClose]);
  return (
    <div style={{
      position:"fixed",left:x,top:y,zIndex:200,
      background:"rgba(15,15,30,0.95)",border:"1px solid rgba(162,155,254,0.25)",
      borderRadius:"12px",padding:"6px",minWidth:"180px",
      boxShadow:"0 12px 40px rgba(0,0,0,0.6)",animation:"dialogSlideUp 0.2s ease forwards"
    }} onClick={e=>e.stopPropagation()}>
      {items.map((item,i)=>(
        <button key={i} onClick={()=>{item.action();onClose();}} style={{
          display:"block",width:"100%",padding:"10px 14px",background:"transparent",
          border:"none",color:item.danger?"#ff7675":"#ddd",cursor:"pointer",textAlign:"left",
          fontSize:"0.85rem",fontWeight:"600",borderRadius:"8px",transition:"all 0.15s"
        }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(108,92,231,0.12)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
        >{item.icon} {item.label}</button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(()=>JSON.parse(localStorage.getItem("ghardekho_active_user")||"null"));
  const [folders, setFolders] = useState([]);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [dialog, setDialog] = useState(null); // {type, ...props}
  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(()=>{if(!currentUser)navigate("/");},[currentUser,navigate]);

  const reload = () => setFolders(getFolders());
  useEffect(reload,[]);

  // ── Folder actions ──
  const handleRenameFolder = (fid) => {
    const f = folders.find(x=>x.id===fid);
    setDialog({type:"rename",label:"Folder",initial:f.name,onSave:(n)=>{renameFolder(fid,n);reload();setDialog(null);}});
  };
  const handleDeleteFolder = (fid) => {
    const f = folders.find(x=>x.id===fid);
    const msg = f.projects.length>0
      ? `Delete folder "${f.name}" and all ${f.projects.length} project(s) inside it? This cannot be undone.`
      : `Delete folder "${f.name}"? This cannot be undone.`;
    setDialog({type:"confirm",message:msg,onConfirm:()=>{deleteFolder(fid);if(openFolderId===fid)setOpenFolderId(null);reload();setDialog(null);}});
  };

  // ── Project actions ──
  const handleRenameProject = (fid,pid) => {
    const f = folders.find(x=>x.id===fid);
    const p = f?.projects.find(x=>x.id===pid);
    setDialog({type:"rename",label:"Project",initial:p.name,onSave:(n)=>{renameProject(fid,pid,n);reload();setDialog(null);}});
  };
  const handleDuplicateProject = (fid,pid) => { duplicateProject(fid,pid); reload(); };
  const handleDeleteProject = (fid,pid) => {
    const f = folders.find(x=>x.id===fid);
    const p = f?.projects.find(x=>x.id===pid);
    setDialog({type:"confirm",message:`Delete project "${p.name}"? This cannot be undone.`,
      onConfirm:()=>{deleteProject(fid,pid);reload();setDialog(null);}});
  };
  const handleMoveProject = (fid,pid) => {
    setDialog({type:"move",currentFolderId:fid,onMove:(targetId)=>{moveProject(fid,targetId,pid);reload();setDialog(null);}});
  };

  // ── New project flow ──
  const handleNewProjectSelect = (folderId, projectName) => {
    setShowNewProject(false);
    playPageTransitionSound();
    const nameParam = projectName.trim() ? `&name=${encodeURIComponent(projectName.trim())}` : '';
    navigate(`/design?folderId=${folderId}&mode=new${nameParam}`);
  };
  const handleNewProjectCreate = (folderName, projectName) => {
    const folder = createFolder(folderName);
    setShowNewProject(false);
    playPageTransitionSound();
    const nameParam = projectName.trim() ? `&name=${encodeURIComponent(projectName.trim())}` : '';
    navigate(`/design?folderId=${folder.id}&mode=new${nameParam}`);
  };

  const openFolder = folders.find(f=>f.id===openFolderId);

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
    catch { return iso; }
  };

  return (
    <div className="page-transition animated-bg" style={{minHeight:"100vh",color:"#fff",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"auto",position:"relative"}}>
      {/* Glow blobs */}
      <div style={{position:"absolute",top:"-15%",left:"-10%",width:"600px",height:"600px",background:"radial-gradient(circle,rgba(108,92,231,0.25) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-15%",right:"-10%",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(0,184,148,0.18) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>

      {/* Navbar */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 48px",borderBottom:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <button onClick={()=>{playCuteClickSound();playPageTransitionSound();navigate("/");}} style={{
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"10px",
            color:"#ccc",padding:"8px 16px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"700",transition:"all 0.2s"
          }}>← Home</button>
          <div style={{fontSize:"1.3rem",fontWeight:"900",background:"linear-gradient(90deg,#a29bfe,#6c5ce7,#00b894)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            🏠 GharDekho
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"0.82rem",color:"#a29bfe",fontWeight:"700",background:"rgba(162,155,254,0.1)",border:"1px solid rgba(162,155,254,0.25)",padding:"6px 12px",borderRadius:"20px"}}>
            👤 {currentUser?.email||currentUser?.number}
          </span>
        </div>
      </nav>

      {/* Content */}
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"40px 32px",position:"relative",zIndex:10}}>
        {/* Header */}
        <div className="animate-pop-in" style={{textAlign:"center",marginBottom:"48px"}}>
          <span style={{fontSize:"3.5rem",display:"block",marginBottom:"12px"}}>📂</span>
          <h1 style={{fontSize:"2.4rem",fontWeight:"900",marginBottom:"8px",background:"linear-gradient(135deg,#fff,#a29bfe)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            Project Manager
          </h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:"1rem"}}>Organize, save, and restore your room designs</p>
        </div>

        {/* Action buttons */}
        <div className="animate-fade-in-up" style={{display:"flex",gap:"16px",justifyContent:"center",marginBottom:"48px",flexWrap:"wrap"}}>
          <button onClick={()=>{playCuteClickSound();setShowNewProject(true);}} className="landing-btn-pulse" style={{
            padding:"18px 40px",background:"linear-gradient(135deg,#6c5ce7,#a29bfe)",border:"none",borderRadius:"14px",
            color:"#fff",fontWeight:"700",cursor:"pointer",fontSize:"1.1rem",
            boxShadow:"0 8px 32px rgba(108,92,231,0.5)",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"8px"
          }}>➕ New Project</button>
        </div>

        {/* My Projects */}
        <div style={{marginBottom:"32px"}}>
          <h2 style={{fontSize:"1.3rem",fontWeight:"800",color:"#a29bfe",marginBottom:"20px",display:"flex",alignItems:"center",gap:"8px"}}>
            📁 My Projects
          </h2>

          {folders.length===0 ? (
            <div style={{textAlign:"center",padding:"60px 20px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:"16px"}}>
              <span style={{fontSize:"3rem",display:"block",marginBottom:"12px",opacity:0.4}}>📭</span>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:"0.95rem"}}>No projects yet. Click "New Project" to get started!</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {folders.map((folder,fi)=>(
                <div key={folder.id} className="catalog-item-enter" style={{animationDelay:`${fi*0.06}s`}}>
                  {/* Folder header */}
                  <div style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"18px 22px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius: openFolderId===folder.id?"14px 14px 0 0":"14px",cursor:"pointer",transition:"all 0.2s"
                  }}
                    onClick={()=>{playCuteClickSound();setOpenFolderId(openFolderId===folder.id?null:folder.id);}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(108,92,231,0.3)";e.currentTarget.style.background="rgba(108,92,231,0.05)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.background="rgba(255,255,255,0.03)"}}
                  >
                    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                      <span style={{fontSize:"1.5rem"}}>{openFolderId===folder.id?"📂":"📁"}</span>
                      <div>
                        <div style={{fontWeight:"800",fontSize:"1.05rem",color:"#eee"}}>{folder.name}</div>
                        <div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>
                          {folder.projects.length} project{folder.projects.length!==1?"s":""} · Created {formatDate(folder.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <button onClick={e=>{e.stopPropagation();playCuteClickSound();setCtxMenu({x:e.clientX,y:e.clientY,items:[
                        {icon:"✏️",label:"Rename Folder",action:()=>handleRenameFolder(folder.id)},
                        {icon:"🗑️",label:"Delete Folder",danger:true,action:()=>handleDeleteFolder(folder.id)},
                      ]});}} style={{
                        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",
                        color:"#aaa",padding:"6px 10px",cursor:"pointer",fontSize:"0.9rem",transition:"all 0.15s"
                      }}>⋮</button>
                      <span style={{fontSize:"1.2rem",color:"#666",transition:"transform 0.3s",transform:openFolderId===folder.id?"rotate(90deg)":"rotate(0)"}}>›</span>
                    </div>
                  </div>

                  {/* Folder contents */}
                  {openFolderId===folder.id && (
                    <div style={{
                      background:"rgba(10,10,24,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderTop:"none",
                      borderRadius:"0 0 14px 14px",padding:"20px",animation:"sidebarSlideIn 0.3s ease forwards"
                    }}>
                      {folder.projects.length===0 ? (
                        <p style={{color:"rgba(255,255,255,0.35)",textAlign:"center",padding:"24px",fontSize:"0.88rem"}}>
                          No projects in this folder yet.
                        </p>
                      ) : (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"14px"}}>
                          {folder.projects.map((proj,pi)=>(
                            <div key={proj.id} className="catalog-item-enter" style={{
                              background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",
                              borderRadius:"14px",overflow:"hidden",cursor:"pointer",transition:"all 0.25s",
                              animationDelay:`${pi*0.05}s`
                            }}
                              onClick={()=>{playPageTransitionSound();navigate(`/design?folderId=${folder.id}&projectId=${proj.id}`);}}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor="#6c5ce7";e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(108,92,231,0.2)"}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                            >
                              {/* Thumbnail */}
                              <div style={{width:"100%",height:"140px",background:"linear-gradient(135deg,#0a0a18,#151530)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                                {proj.thumbnail ? (
                                  <img src={proj.thumbnail} alt={proj.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                                ) : (
                                  <span style={{fontSize:"2.5rem",opacity:0.25}}>🏠</span>
                                )}
                              </div>
                              {/* Info */}
                              <div style={{padding:"14px 16px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontWeight:"800",fontSize:"0.92rem",color:"#eee",marginBottom:"4px"}}>{proj.name}</div>
                                    <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.35)"}}>
                                      {proj.data?.room ? `${proj.data.room.length}×${proj.data.room.width}×${proj.data.room.height} ft` : ""}
                                      {" · "}{formatDate(proj.lastModified)}
                                    </div>
                                  </div>
                                  <button onClick={e=>{e.stopPropagation();playCuteClickSound();setCtxMenu({x:e.clientX,y:e.clientY,items:[
                                    {icon:"✏️",label:"Rename",action:()=>handleRenameProject(folder.id,proj.id)},
                                    {icon:"📋",label:"Duplicate",action:()=>handleDuplicateProject(folder.id,proj.id)},
                                    {icon:"📁",label:"Move to...",action:()=>handleMoveProject(folder.id,proj.id)},
                                    {icon:"🗑️",label:"Delete",danger:true,action:()=>handleDeleteProject(folder.id,proj.id)},
                                  ]});}} style={{
                                    background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
                                    borderRadius:"6px",color:"#aaa",padding:"4px 8px",cursor:"pointer",fontSize:"0.85rem"
                                  }}>⋮</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showNewProject && <NewProjectDialog folders={folders} onSelect={handleNewProjectSelect} onCreate={handleNewProjectCreate} onCancel={()=>setShowNewProject(false)} />}
      {dialog?.type==="confirm" && <ConfirmDialog message={dialog.message} onConfirm={dialog.onConfirm} onCancel={()=>setDialog(null)} />}
      {dialog?.type==="rename" && <RenameDialog label={dialog.label} initial={dialog.initial} onSave={dialog.onSave} onCancel={()=>setDialog(null)} />}
      {dialog?.type==="move" && <MoveDialog folders={folders} currentFolderId={dialog.currentFolderId} onMove={dialog.onMove} onCancel={()=>setDialog(null)} />}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={()=>setCtxMenu(null)} />}
    </div>
  );
}
