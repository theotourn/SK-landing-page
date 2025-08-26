import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { ChevronDown, List, Plus, Trash2, Edit, XCircle, ShoppingCart, Home, Book, Plane, Heart, Star, Cloud, Sun, Briefcase, Gift, DollarSign, FileText, Folder, LogIn, LogOut, Bold, Italic, Underline, Image, ArrowLeft, Music, Dumbbell, Utensils, GraduationCap, Palette, Check, Save, X } from 'lucide-react';

// Dnd-kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useUseSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable'; // Helper para reordenar arrays

// --- Configuração da API do Google Drive ---
// Importante: Substitua estas chaves pelos seus próprios valores do Google Cloud Console.
const CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID';
const API_KEY = 'YOUR_GOOGLE_DRIVE_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Contexto para Gerenciamento de Dados do Drive
const DriveDataStateContext = createContext(null);
const DriveDataDispatchContext = createContext(null);

// Definição de cores para as listas/pastas
const predefinedColors = [
    { name: 'Azul', class: 'text-blue-600 border-blue-400 bg-blue-50', hex: '#3B82F6' },
    { name: 'Verde', class: 'text-green-600 border-green-400 bg-green-50', hex: '#22C55E' },
    { name: 'Vermelho', class: 'text-red-600 border-red-400 bg-red-50', hex: '#EF4444' },
    { name: 'Roxo', class: 'text-purple-600 border-purple-400 bg-purple-50', hex: '#A855F7' },
    { name: 'Laranja', class: 'text-orange-600 border-orange-400 bg-orange-50', hex: '#F97316' },
    { name: 'Amarelo', class: 'text-yellow-600 border-yellow-400 bg-yellow-50', hex: '#EAB308' },
    { name: 'Cinza', class: 'text-gray-600 border-gray-400 bg-gray-50', hex: '#6B7280' },
];

// Componente Modal genérico
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-800 transition duration-200 p-2 rounded-full hover:bg-gray-100"
                    aria-label="Fechar modal"
                >
                    <XCircle size={24} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

// Novo componente de Modal para URL de Imagem
const ImageUrlModal = ({ onClose, onConfirm }) => {
    const [imageUrl, setImageUrl] = useState('');
    return (
        <Modal title="Inserir Imagem por URL" onClose={onClose}>
            <div className="p-6">
                <label htmlFor="imageUrlInput" className="block text-gray-700 text-sm font-bold mb-2">
                    URL da Imagem:
                </label>
                <input
                    type="url"
                    id="imageUrlInput"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
                    placeholder="https://exemplo.com/imagem.jpg"
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-200">
                        Cancelar
                    </button>
                    <button
                        onClick={() => { if (imageUrl.trim()) onConfirm(imageUrl.trim()); onClose(); }}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                        disabled={!imageUrl.trim()}
                    >
                        Inserir
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Componente de Editor de Rich Text Customizado
const RichTextEditor = ({ value, onChange, placeholder, disabled }) => {
    const editorRef = useRef(null);
    const initialValue = useRef(value); // Armazena o valor inicial uma vez
    const [activeFormats, setActiveFormats] = useState({}); // Estado para formatos ativos

    // Função para atualizar o estado dos formatos ativos
    const updateActiveFormats = useCallback(() => {
        if (editorRef.current) {
            setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
            });
        }
    }, []);

    // Define o conteúdo inicial na montagem
    useEffect(() => {
        if (editorRef.current && initialValue.current !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = initialValue.current;
        }
        updateActiveFormats(); // Atualiza formatos na montagem
    }, [updateActiveFormats]);

    // Atualiza o conteúdo apenas se a prop 'value' mudar externamente E o editor não estiver focado
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            const selection = window.getSelection();
            const isFocused = editorRef.current.contains(selection.anchorNode);

            if (!isFocused) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const applyFormat = useCallback((command, commandValue = null) => {
        editorRef.current.focus(); // Garante o foco antes de aplicar o comando
        document.execCommand(command, false, commandValue);
        handleInput(); // Sincroniza o estado após o comando
        updateActiveFormats(); // Atualiza formatos após aplicar
    }, [handleInput, updateActiveFormats]);

    const [showImageUrlModal, setShowImageUrlModal] = useState(false);

    // Adiciona listeners para atualizar formatos ao mover o cursor ou soltar o mouse
    useEffect(() => {
        const editorElement = editorRef.current;
        if (editorElement) {
            const handleMouseUp = () => updateActiveFormats();
            const handleKeyUp = () => updateActiveFormats();
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.execCommand('insertLineBreak');
                    handleInput();
                }
            };
            editorElement.addEventListener('mouseup', handleMouseUp);
            editorElement.addEventListener('keyup', handleKeyUp);
            editorElement.addEventListener('keydown', handleKeyDown);
            return () => {
                editorElement.removeEventListener('mouseup', handleMouseUp);
                editorElement.removeEventListener('keyup', handleKeyUp);
                editorElement.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [updateActiveFormats, handleInput]);

    return (
        <div className="border border-gray-300 rounded-lg shadow-sm bg-white">
            <div className="flex bg-gray-100 p-2 border-b border-gray-200 gap-2 flex-wrap">
                <button type="button" onClick={() => applyFormat('bold')} className={`p-1 rounded hover:bg-gray-200 ${activeFormats.bold ? 'bg-gray-300' : ''}`} disabled={disabled} aria-label="Negrito"><Bold size={16} /></button>
                <button type="button" onClick={() => applyFormat('italic')} className={`p-1 rounded hover:bg-gray-200 ${activeFormats.italic ? 'bg-gray-300' : ''}`} disabled={disabled} aria-label="Itálico"><Italic size={16} /></button>
                <button type="button" onClick={() => applyFormat('underline')} className={`p-1 rounded hover:bg-gray-200 ${activeFormats.underline ? 'bg-gray-300' : ''}`} disabled={disabled} aria-label="Sublinhado"><Underline size={16} /></button>
                <button type="button" onClick={() => setShowImageUrlModal(true)} className="p-1 rounded hover:bg-gray-200" disabled={disabled} aria-label="Inserir Imagem"><Image size={16} /></button>
            </div>
            <div
                ref={editorRef}
                className="p-3 min-h-[12rem] focus:outline-none focus:ring-2 focus:ring-blue-400 prose max-w-none custom-richtext-area"
                contentEditable={!disabled}
                onInput={handleInput}
                placeholder={placeholder}
                style={{ cursor: disabled ? 'not-allowed' : 'text' }}
            ></div>
            {showImageUrlModal && (
                <ImageUrlModal
                    onClose={() => setShowImageUrlModal(false)}
                    onConfirm={(url) => applyFormat('insertImage', url)}
                />
            )}
        </div>
    );
};

const App = () => {
    const [allLists, setAllLists] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [selectedListId, setSelectedListId] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
    const [driveFileId, setDriveFileId] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    // Use-se para evitar salvar os dados durante a carga inicial
    const isInitialLoad = useRef(true);

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    // Funções de comunicação com a API do Google Drive
    const getAccessToken = async () => {
        if (!auth.currentUser) return null;
        const token = await auth.currentUser.getIdTokenResult();
        return token.accessToken;
    };

    const getDriveFile = async (accessToken) => {
        const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name="papey-data.json" and "root" in parents and trashed=false', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        return data.files.length > 0 ? data.files : null;
    };

    const createFile = async (accessToken) => {
        const metadata = {
            'name': 'papey-data.json',
            'mimeType': 'application/json'
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('media', new Blob([JSON.stringify({ lists: [], items: [] }, null, 2)], { type: 'application/json' }));
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        });
        return await response.json();
    };
    
    const readFile = async (accessToken, fileId) => {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return await response.json();
    };
    
    const updateFile = async (accessToken, fileId, data) => {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    };

    // Inicialização e Sincronização
    useEffect(() => {
        const initializeFirebaseAndSync = async () => {
            try {
                // Suas credenciais do Firebase
                const firebaseConfig = {
                    apiKey: "AIzaSyAV4ITquqVmAzdg6_m-t8M_bCt5lscQ4UM",
                    authDomain: "papey-app.firebaseapp.com",
                    projectId: "papey-app",
                    storageBucket: "papey-app.firebasestorage.app",
                    messagingSenderId: "255614718011",
                    appId: "1:255614718011:web:55a47822a9084d75308c1e",
                    measurementId: "G-0KV51MEYRZ"
                };

                const app = initializeApp(firebaseConfig);
                const authentication = getAuth(app);
                setAuth(authentication);

                onAuthStateChanged(authentication, async (user) => {
                    setIsUserAuthenticated(!!user);
                    if (user) {
                        setLoading(true);
                        setIsSyncing(true);
                        const accessToken = await getAccessToken();
                        if (accessToken) {
                            try {
                                const file = await getDriveFile(accessToken);
                                let fileId;
                                if (file) {
                                    fileId = file.id;
                                    const fileContent = await readFile(accessToken, fileId);
                                    setAllLists(fileContent.lists || []);
                                    setAllItems(fileContent.items || []);
                                    console.log("Dados carregados do Google Drive.");
                                } else {
                                    const newFile = await createFile(accessToken);
                                    fileId = newFile.id;
                                    console.log("Novo arquivo criado no Google Drive.");
                                    setAllLists([]);
                                    setAllItems([]);
                                }
                                setDriveFileId(fileId);
                            } catch (e) {
                                console.error("Erro na sincronização inicial com o Google Drive:", e);
                                setError("Não foi possível sincronizar com o Google Drive. Verifique suas permissões.");
                            }
                        }
                    } else {
                        setAllLists([]);
                        setAllItems([]);
                        setDriveFileId(null);
                    }
                    setLoading(false);
                    setIsSyncing(false);
                });
            } catch (error) {
                console.error("Erro ao inicializar o Firebase/Google Drive:", error);
                setError("Ocorreu um erro fatal ao carregar o aplicativo.");
                setLoading(false);
            }
        };

        initializeFirebaseAndSync();
    }, []);

    // Sincroniza dados com o Drive sempre que o estado muda
    useEffect(() => {
        if (!isUserAuthenticated || !driveFileId || isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        setIsSyncing(true);
        const timeoutId = setTimeout(async () => {
            const accessToken = await getAccessToken();
            if (accessToken) {
                try {
                    await updateFile(accessToken, driveFileId, { lists: allLists, items: allItems });
                    console.log("Dados salvos no Google Drive.");
                } catch (e) {
                    console.error("Erro ao salvar no Google Drive:", e);
                    setError("Não foi possível salvar os dados no Google Drive.");
                }
            }
            setIsSyncing(false);
        }, 1000); // Debounce de 1 segundo
        
        return () => clearTimeout(timeoutId);
    }, [allLists, allItems, isUserAuthenticated, driveFileId]);


    const handleGoogleSignIn = async () => {
        if (!auth) return;
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao fazer login com Google:", error);
            setError("Erro ao fazer login. Verifique o console para mais detalhes.");
        }
    };

    const handleSignOut = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setAllLists([]);
            setAllItems([]);
            setDriveFileId(null);
            setCurrentPage('home');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            setError("Não foi possível fazer logout. Tente novamente.");
        }
    };
    
    if (loading) {
        return <LoadingSpinner text="Sincronizando com o Google Drive..." />;
    }

    if (!isUserAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
                    <h2 className="text-2xl font-bold mb-4">Bem-vindo ao Papey!</h2>
                    <p className="text-gray-600 mb-6">Faça login com sua conta Google para começar a criar e salvar suas listas.</p>
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} /> Login com Google
                    </button>
                </div>
            </div>
        );
    }
    
    const navigateToList = (listId) => {
        setSelectedListId(listId);
        setCurrentPage('listView');
    };

    const navigateToHome = () => {
        setCurrentPage('home');
        setSelectedListId(null);
    };

    return (
        <DriveDataStateContext.Provider value={{ allLists, allItems }}>
            <DriveDataDispatchContext.Provider value={{ setAllLists, setAllItems }}>
                <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 font-sans text-gray-800 flex flex-col items-center p-4 sm:p-6">
                    <header className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-4 mb-6 flex justify-between items-center z-10">
                        <div className="flex items-center gap-3">
                            <FileText size={32} className="text-blue-600" />
                            <h1 className="text-3xl font-extrabold text-blue-600">
                                Papey
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 hidden sm:block">
                                {isSyncing ? "Sincronizando..." : "Sincronizado"}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-full shadow-md transition duration-300 flex items-center gap-2 text-sm sm:text-base"
                            >
                                <LogOut size={20} /> Sair
                            </button>
                        </div>
                    </header>
                    {error && (
                        <div className="w-full max-w-4xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-md mb-6" role="alert">
                            <strong className="font-bold">Erro:</strong>
                            <span className="block sm:inline ml-2">{error}</span>
                        </div>
                    )}
                    <main className="w-full max-w-4xl flex-grow bg-white p-6 rounded-2xl shadow-xl">
                        {currentPage === 'home' ? (
                            <HomeComponent navigateToList={navigateToList} />
                        ) : (
                            <ListView listId={selectedListId} navigateToHome={navigateToHome} navigateToList={navigateToList} />
                        )}
                    </main>

                    <footer className="mt-8 text-center text-gray-600 text-sm">
                        <p>Feito com ❤️ e Google Drive</p>
                        <p>Dados salvos na sua conta Google: {auth.currentUser.email}</p>
                    </footer>
                </div>
            </DriveDataDispatchContext.Provider>
        </DriveDataStateContext.Provider>
    );
};

const LoadingSpinner = ({ text = "Carregando..." }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <p className="mt-4 text-xl font-semibold">{text}</p>
    </div>
);

// Função auxiliar para deletar pastas e seus conteúdos recursivamente localmente
const deleteFolderAndContents = (allLists, allItems, folderId) => {
    let listsToDelete = [folderId];
    let itemsToDelete = [];

    // Encontra todas as sub-listas/pastas e seus itens recursivamente
    const findChildren = (id) => {
        const children = allLists.filter(l => l.parentListId === id);
        children.forEach(child => {
            listsToDelete.push(child.id);
            if (child.type === 'item-list') {
                itemsToDelete.push(...allItems.filter(i => i.listId === child.id).map(i => i.id));
            } else if (child.type === 'folder-list') {
                findChildren(child.id);
            }
        });
    };

    findChildren(folderId);

    // Deleta os itens e as listas/pastas
    const remainingItems = allItems.filter(item => !itemsToDelete.includes(item.id));
    const remainingLists = allLists.filter(list => !listsToDelete.includes(list.id));

    return { updatedLists: remainingLists, updatedItems: remainingItems };
};

// Componente para o card de criação de nova lista/pasta
const CreateNewListCard = ({ onClick }) => {
    return (
        <div
            onClick={onClick}
            className="relative bg-white rounded-xl shadow-md p-6 flex flex-col items-center justify-center transform hover:scale-105 transition duration-300 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer min-h-[150px]"
        >
            <Plus size={48} className="text-gray-400 hover:text-blue-600 transition duration-300" />
            <h3 className="text-lg font-semibold text-gray-600 hover:text-blue-700 mt-4 transition duration-300">
                Criar Nova Lista/Pasta
            </h3>
        </div>
    );
};

// Componente para a tela inicial (Home)
const HomeComponent = ({ navigateToList }) => {
    const { allLists } = useContext(DriveDataStateContext);
    const { setAllLists, setAllItems } = useContext(DriveDataDispatchContext);
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [listToDelete, setListToDelete] = useState(null);

    // Filtra as listas de nível raiz
    const rootLists = allLists.filter(l => l.parentListId === null).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Configuração dos sensores para drag-and-drop com delay e distância
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 250, distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Ícones comuns para seleção
    const commonIcons = [
        { name: 'Lista', icon: <List size={24} /> },
        { name: 'Pasta', icon: <Folder size={24} /> },
        { name: 'Papel', icon: <FileText size={24} /> },
        { name: 'Compras', icon: <ShoppingCart size={24} /> },
        { name: 'Casa', icon: <Home size={24} /> },
        { name: 'Livros', icon: <Book size={24} /> },
        { name: 'Viagem', icon: <Plane size={24} /> },
        { name: 'Coração', icon: <Heart size={24} /> },
        { name: 'Estrela', icon: <Star size={24} /> },
        { name: 'Nuvem', icon: <Cloud size={24} /> },
        { name: 'Sol', icon: <Sun size={24} /> },
        { name: 'Trabalho', icon: <Briefcase size={24} /> },
        { name: 'Presente', icon: <Gift size={24} /> },
        { name: 'Dinheiro', icon: <DollarSign size={24} /> },
        { name: 'Música', icon: <Music size={24} /> },
        { name: 'Esportes', icon: <Dumbbell size={24} /> },
        { name: 'Comida', icon: <Utensils size={24} /> },
        { name: 'Estudo', icon: <GraduationCap size={24} /> },
        { name: 'Paleta', icon: <Palette size={24} /> },
    ];

    const handleDeleteClick = (list) => {
        setListToDelete(list);
        setShowConfirmDeleteModal(true);
    };

    const confirmDeleteList = () => {
        if (!listToDelete) return;

        const { updatedLists, updatedItems } = deleteFolderAndContents(allLists, [], listToDelete.id);
        
        setAllLists(updatedLists);
        setAllItems(updatedItems);
        setShowConfirmDeleteModal(false);
        setListToDelete(null);
        console.log("Lista/Pasta e conteúdos associados deletados localmente.");
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = rootLists.findIndex(list => list.id === active.id);
        const newIndex = rootLists.findIndex(list => list.id === over.id);
        const newOrder = arrayMove(rootLists, oldIndex, newIndex);

        // Atualiza o estado local de todas as listas para manter a ordem
        setAllLists(prevLists => {
            const updatedLists = [...prevLists];
            newOrder.forEach((list, index) => {
                const listToUpdate = updatedLists.find(l => l.id === list.id);
                if (listToUpdate) {
                    listToUpdate.order = index;
                }
            });
            return updatedLists.sort((a,b) => (a.order || 0) - (b.order || 0));
        });
    };

    return (
        <div className="p-4 sm:p-6">
            <h2 className="text-3xl font-bold text-center text-blue-700 mb-4 pb-4 border-b border-gray-200 -mt-2">
                Minhas Listas
            </h2>
            
            {rootLists.length === 0 && !showCreateListModal ? (
                <p className="text-center text-gray-600 text-lg mb-8">
                    Você ainda não tem nenhuma lista ou pasta. Crie uma para começar!
                </p>
            ) : null}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rootLists.map(list => list.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rootLists.map((list) => (
                            <SortableListCard
                                key={list.id}
                                list={list}
                                navigateToList={navigateToList}
                                onDelete={handleDeleteClick}
                                commonIcons={commonIcons}
                            />
                        ))}
                        <CreateNewListCard onClick={() => setShowCreateListModal(true)} />
                    </div>
                </SortableContext>
            </DndContext>

            {showCreateListModal && (
                <CreateListModal
                    onClose={() => setShowCreateListModal(false)}
                    commonIcons={commonIcons}
                    parentListId={null}
                />
            )}

            {showConfirmDeleteModal && (
                <ConfirmModal
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja deletar a ${listToDelete?.type === 'folder-list' ? 'pasta' : 'lista'} "${listToDelete?.title}" e ${listToDelete?.type === 'folder-list' ? 'todo o seu conteúdo (listas e itens)' : 'todos os seus itens'}?`}
                    onConfirm={confirmDeleteList}
                    onCancel={() => setShowConfirmDeleteModal(false)}
                />
            )}
        </div>
    );
};

// Componente ListCard que agora é sortable
const SortableListCard = ({ list, navigateToList, onDelete, commonIcons }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.8 : 1,
        marginBottom: isDragging ? '1.5rem' : '0',
    };

    const IconComponent = commonIcons.find(icon => icon.name === list.iconName)?.icon || (list.type === 'folder-list' ? <Folder size={24} /> : <List size={24} />);
    const listColorClass = predefinedColors.find(color => color.name === list.color)?.class || predefinedColors.class;
    const textColorClass = listColorClass.split(' ');
    const borderColorClass = listColorClass.split(' ');
    const bgColorClass = listColorClass.split(' ');

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative bg-white rounded-xl shadow-md p-6 flex flex-col items-center justify-between transform hover:scale-105 transition duration-300 border ${borderColorClass} ${list.type === 'folder-list' ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-b-4 border-r-4' : ''} ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(list); }}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 transition duration-200"
                aria-label="Deletar lista"
            >
                <Trash2 size={20} />
            </button>
            <div
                onClick={() => navigateToList(list.id)}
                className="cursor-pointer flex flex-col items-center justify-center flex-grow w-full"
            >
                <div className={`mb-4 p-3 rounded-full ${bgColorClass.replace('bg-', 'bg-opacity-20 ')}`}>
                    {React.cloneElement(IconComponent, { className: textColorClass })}
                </div>
                <h3 className={`text-xl font-semibold text-center leading-tight ${textColorClass}`}>
                    {list.title}
                </h3>
            </div>
        </div>
    );
};


// Modal para criar nova lista/pasta
const CreateListModal = ({ onClose, commonIcons, parentListId = null }) => {
    const { allLists } = useContext(DriveDataStateContext);
    const { setAllLists } = useContext(DriveDataDispatchContext);
    const [title, setTitle] = useState('');
    const [selectedIconName, setSelectedIconName] = useState(parentListId ? 'Papel' : 'Pasta');
    const [listType, setListType] = useState(parentListId ? 'item-list' : 'folder-list');
    const [selectedColor, setSelectedColor] = useState(predefinedColors.name);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCreateList = async () => {
        if (!title.trim()) {
            setError("O título da lista não pode estar vazio.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const currentOrder = allLists.filter(l => l.parentListId === parentListId).length;

            const newList = {
                id: crypto.randomUUID(),
                title: title.trim(),
                iconName: selectedIconName,
                type: listType,
                parentListId: parentListId,
                color: selectedColor,
                order: currentOrder,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            setAllLists(prevLists => [...prevLists, newList]);
            onClose();
        } catch (err) {
            console.error("Erro ao criar lista:", err);
            setError("Não foi possível criar a lista.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title={parentListId ? "Criar Nova Lista" : "Criar Nova Lista/Pasta"} onClose={onClose}>
            <div className="p-6">
                <label htmlFor="listTitle" className="block text-gray-700 text-sm font-bold mb-2">
                    Título da {listType === 'folder-list' ? 'Pasta' : 'Lista'}:
                </label>
                <input
                    type="text"
                    id="listTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
                    placeholder="Minha lista de compras"
                    disabled={loading}
                />

                {!parentListId && (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Tipo:
                        </label>
                        <div className="flex gap-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600"
                                    name="listType"
                                    value="folder-list"
                                    checked={listType === 'folder-list'}
                                    onChange={() => {
                                        setListType('folder-list');
                                        setSelectedIconName('Pasta');
                                    }}
                                    disabled={loading}
                                />
                                <span className="ml-2 text-gray-700">Pasta</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600"
                                    name="listType"
                                    value="item-list"
                                    checked={listType === 'item-list'}
                                    onChange={() => {
                                        setListType('item-list');
                                        setSelectedIconName('Papel');
                                    }}
                                    disabled={loading}
                                />
                                <span className="ml-2 text-gray-700">Lista de Itens</span>
                            </label>
                        </div>
                    </div>
                )}

                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Escolha um Ícone:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6 max-h-48 overflow-y-auto custom-scrollbar p-2 border rounded-lg bg-gray-50">
                    {commonIcons.map((iconData) => (
                        <button
                            key={iconData.name}
                            onClick={() => setSelectedIconName(iconData.name)}
                            className={`p-3 rounded-full flex items-center justify-center transition duration-200
                                ${selectedIconName === iconData.name ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-blue-200 hover:text-blue-700'}`}
                            disabled={loading}
                        >
                            {iconData.icon}
                        </button>
                    ))}
                </div>

                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Escolha uma Cor:
                </label>
                <div className="grid grid-cols-6 gap-2 mb-6">
                    {predefinedColors.map((colorOption) => (
                        <button
                            key={colorOption.name}
                            onClick={() => setSelectedColor(colorOption.name)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition duration-200
                                ${selectedColor === colorOption.name ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                            style={{ backgroundColor: colorOption.hex }}
                            disabled={loading}
                        >
                            {selectedColor === colorOption.name && <Check size={16} className="text-white" />}
                        </button>
                    ))}
                </div>

                {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-200"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateList}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading ? 'Criando...' : <><Plus size={20} /> Criar {listType === 'folder-list' ? 'Pasta' : 'Lista'}</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Componente para a tela de detalhes da lista/pasta
const ListView = ({ listId, navigateToHome, navigateToList }) => {
    const { allLists, allItems } = useContext(DriveDataStateContext);
    const { setAllLists, setAllItems } = useContext(DriveDataDispatchContext);
    const [currentList, setCurrentList] = useState(null);
    const [isCreateListModalVisible, setIsCreateListModalVisible] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [editingItemId, setEditingItemId] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);
    const [showConfirmDeleteItemModal, setShowConfirmDeleteItemModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showConfirmDeleteChildListModal, setShowConfirmDeleteChildListModal] = useState(false);
    const [listToDelete, setListToDelete] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filtra as listas filhas ou itens com base no listId
    const childLists = allLists.filter(l => l.parentListId === listId).sort((a,b) => (a.order || 0) - (b.order || 0));
    const items = allItems.filter(i => i.listId === listId).sort((a,b) => (a.order || 0) - (b.order || 0));

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 250, distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const commonIcons = [
        { name: 'Lista', icon: <List size={24} /> },
        { name: 'Pasta', icon: <Folder size={24} /> },
        { name: 'Papel', icon: <FileText size={24} /> },
        { name: 'Compras', icon: <ShoppingCart size={24} /> },
        { name: 'Casa', icon: <Home size={24} /> },
        { name: 'Livros', icon: <Book size={24} /> },
        { name: 'Viagem', icon: <Plane size={24} /> },
        { name: 'Coração', icon: <Heart size={24} /> },
        { name: 'Estrela', icon: <Star size={24} /> },
        { name: 'Nuvem', icon: <Cloud size={24} /> },
        { name: 'Sol', icon: <Sun size={24} /> },
        { name: 'Trabalho', icon: <Briefcase size={24} /> },
        { name: 'Presente', icon: <Gift size={24} /> },
        { name: 'Dinheiro', icon: <DollarSign size={24} /> },
        { name: 'Música', icon: <Music size={24} /> },
        { name: 'Esportes', icon: <Dumbbell size={24} /> },
        { name: 'Comida', icon: <Utensils size={24} /> },
        { name: 'Estudo', icon: <GraduationCap size={24} /> },
        { name: 'Paleta', icon: <Palette size={24} /> },
    ];

    useEffect(() => {
        const list = allLists.find(l => l.id === listId);
        if (list) {
            setCurrentList(list);
            setError(null);
        } else {
            setError("Lista/Pasta não encontrada.");
        }
    }, [listId, allLists]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                navigateToHome();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [error, navigateToHome]);


    const handleNavigateToChildList = (childListId) => {
        navigateToList(childListId);
    };

    const handleNavigateUp = () => {
        if (currentList?.parentListId) {
            navigateToList(currentList.parentListId);
        } else {
            navigateToHome();
        }
    };

    const handleEditItemInline = (itemId) => {
        setEditingItemId(itemId);
        setExpandedItem(itemId);
    };

    const handleSaveItemInline = (itemToUpdate) => {
        setAllItems(prevItems => prevItems.map(item =>
            item.id === itemToUpdate.id ? { ...item, title: itemToUpdate.title, description: itemToUpdate.description, updatedAt: new Date().toISOString() } : item
        ));
        setEditingItemId(null);
    };

    const handleCancelEditItemInline = () => {
        setEditingItemId(null);
    };

    const handleDeleteItemClick = (item) => {
        setItemToDelete(item);
        setShowConfirmDeleteItemModal(true);
    };

    const confirmDeleteItem = () => {
        setAllItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
        setShowConfirmDeleteItemModal(false);
        setItemToDelete(null);
    };

    const handleDeleteListClick = (list) => {
        setListToDelete(list);
        setShowConfirmDeleteChildListModal(true);
    };

    const confirmDeleteChildList = () => {
        if (!listToDelete) return;
        const { updatedLists, updatedItems } = deleteFolderAndContents(allLists, allItems, listToDelete.id);
        setAllLists(updatedLists);
        setAllItems(updatedItems);
        setShowConfirmDeleteChildListModal(false);
        setListToDelete(null);
        console.log("Lista/Pasta e conteúdos associados deletados localmente.");
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        if (currentList.type === 'folder-list') {
            const oldIndex = childLists.findIndex(list => list.id === active.id);
            const newIndex = childLists.findIndex(list => list.id === over.id);
            const newOrder = arrayMove(childLists, oldIndex, newIndex);
            
            setAllLists(prevLists => {
                const updatedLists = [...prevLists];
                newOrder.forEach((list, index) => {
                    const listToUpdate = updatedLists.find(l => l.id === list.id);
                    if (listToUpdate) {
                        listToUpdate.order = index;
                    }
                });
                return updatedLists.sort((a,b) => (a.order || 0) - (b.order || 0));
            });
        } else { // item-list
            const oldIndex = items.findIndex(item => item.id === active.id);
            const newIndex = items.findIndex(item => item.id === over.id);
            const newOrder = arrayMove(items, oldIndex, newIndex);
            
            setAllItems(prevItems => {
                const updatedItems = [...prevItems];
                newOrder.forEach((item, index) => {
                    const itemToUpdate = updatedItems.find(i => i.id === item.id);
                    if (itemToUpdate) {
                        itemToUpdate.order = index;
                    }
                });
                return updatedItems.sort((a,b) => (a.order || 0) - (b.order || 0));
            });
        }
    };

    const handleAddNewItem = () => {
        if (!newItemTitle.trim()) {
            console.warn("Título do novo item não pode ser vazio.");
            return;
        }

        const currentOrder = allItems.filter(i => i.listId === listId).length;

        const newItem = {
            id: crypto.randomUUID(),
            listId: listId,
            title: newItemTitle.trim(),
            description: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: currentOrder,
        };
        
        setAllItems(prevItems => [...prevItems, newItem]);
        setNewItemTitle('');
        console.log("Novo item adicionado localmente.");
    };


    if (error) {
        return <div className="text-red-600 text-center py-8">{error}</div>;
    }

    if (!currentList) {
        return <p className="text-center text-gray-600">Carregando detalhes...</p>;
    }

    const currentColorClass = predefinedColors.find(color => color.name === currentList.color)?.class || predefinedColors.class;

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-4 border-b border-gray-200 -mt-2">
                <h2 className={`text-3xl font-bold ${currentColorClass.split(' ')[0]} mb-2 sm:mb-0`}>
                    {currentList.title}
                </h2>
                {currentList.parentListId || currentList.parentListId === null ? (
                    <button
                        onClick={handleNavigateUp}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full shadow-md transition duration-300 flex items-center gap-2"
                    >
                        <ArrowLeft size={20} /> Voltar
                    </button>
                ) : null}
            </div>

            {currentList.type === 'folder-list' ? (
                <>
                    {childLists.length === 0 && !isCreateListModalVisible ? (
                        <p className="text-center text-gray-600 text-lg mb-8">
                            Esta pasta está vazia. Crie uma nova lista ou pasta dentro dela!
                        </p>
                    ) : null}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={childLists.map(list => list.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {childLists.map((list) => (
                                    <SortableListCard
                                        key={list.id}
                                        list={list}
                                        navigateToList={handleNavigateToChildList}
                                        onDelete={handleDeleteListClick}
                                        commonIcons={commonIcons}
                                    />
                                ))}
                                <CreateNewListCard onClick={() => setIsCreateListModalVisible(true)} />
                            </div>
                        </SortableContext>
                    </DndContext>

                    {isCreateListModalVisible && (
                        <CreateListModal
                            onClose={() => setIsCreateListModalVisible(false)}
                            commonIcons={commonIcons}
                            parentListId={currentList.id}
                        />
                    )}

                    {showConfirmDeleteChildListModal && (
                        <ConfirmModal
                            title="Confirmar Exclusão"
                            message={`Tem certeza que deseja deletar a ${listToDelete?.type === 'folder-list' ? 'pasta' : 'lista'} "${listToDelete?.title}" e ${listToDelete?.type === 'folder-list' ? 'todo o seu conteúdo (listas e itens)' : 'todos os seus itens'}?`}
                            onConfirm={confirmDeleteChildList}
                            onCancel={() => setShowConfirmDeleteChildListModal(false)}
                        />
                    )}
                </>
            ) : (
                <>
                    <div className="flex flex-row items-center gap-4 mb-8">
                        <input
                            type="text"
                            placeholder="Título do novo item"
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            className="shadow appearance-none border rounded-lg w-full flex-grow py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button
                            onClick={handleAddNewItem}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-3 rounded-full shadow-lg transform hover:scale-105 transition duration-300 flex items-center justify-center flex-shrink-0"
                            disabled={!newItemTitle.trim()}
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <p className="text-center text-gray-600 text-lg">
                            Esta lista ainda não tem itens. Adicione um!
                        </p>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
                                    {items.map((item, index) => (
                                        <SortableItemCard
                                            key={item.id}
                                            item={item}
                                            isExpanded={expandedItem === item.id}
                                            onToggleExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                            onEdit={handleEditItemInline}
                                            onSave={handleSaveItemInline}
                                            onCancelEdit={handleCancelEditItemInline}
                                            onDelete={() => handleDeleteItemClick(item)}
                                            isFirst={index === 0}
                                            isLast={index === items.length - 1}
                                            isEditing={editingItemId === item.id}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {showConfirmDeleteItemModal && (
                        <ConfirmModal
                            title="Confirmar Exclusão do Item"
                            message={`Tem certeza que deseja deletar o item "${itemToDelete?.title}"?`}
                            onConfirm={confirmDeleteItem}
                            onCancel={() => setShowConfirmDeleteItemModal(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
};

// Componente do cartão de item individual com acordeão que agora é sortable e editável inline
const SortableItemCard = ({ item, isExpanded, onToggleExpand, onEdit, onSave, onCancelEdit, onDelete, isFirst, isLast, isEditing }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const [editedTitle, setEditedTitle] = useState(item.title);
    const [editedDescription, setEditedDescription] = useState(item.description);

    useEffect(() => {
        setEditedTitle(item.title);
        setEditedDescription(item.description);
    }, [item, isEditing]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.8 : 1,
    };

    const handleSave = (e) => {
        e.stopPropagation();
        onSave({ ...item, title: editedTitle, description: editedDescription });
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        onCancelEdit();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`bg-white overflow-hidden transition-all duration-300 ease-in-out
            ${isFirst ? 'rounded-t-xl' : ''}
            ${isLast ? 'rounded-b-xl' : ''}
            ${!isFirst ? 'border-t border-gray-100' : ''}
            ${isDragging ? 'ring-2 ring-purple-500' : ''}
        `}>
            {/* Área do título - Drag Handle */}
            <div
                className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition duration-200"
                onClick={onToggleExpand}
                {...listeners}
            >
                {isEditing ? (
                    <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xl font-semibold text-gray-800 flex-grow w-full p-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 mr-2"
                    />
                ) : (
                    <h3 className="text-xl font-semibold text-gray-800 flex-grow">
                        {item.title}
                    </h3>
                )}
                <div className={`flex items-center gap-3 ml-auto flex-shrink-0 ${isEditing ? 'flex-wrap justify-end w-full sm:w-auto mt-2 sm:mt-0' : ''}`}>
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="text-green-500 hover:text-green-700 transition duration-200 p-1 rounded-full hover:bg-green-100"
                                aria-label="Salvar item"
                                disabled={!editedTitle.trim()}
                            >
                                <Save size={20} />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="text-gray-500 hover:text-gray-700 transition duration-200 p-1 rounded-full hover:bg-gray-100"
                                aria-label="Cancelar edição"
                            >
                                <X size={20} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
                            className="text-blue-500 hover:text-blue-700 transition duration-200 p-1 rounded-full hover:bg-blue-100"
                            aria-label="Editar item"
                        >
                            <Edit size={20} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-red-500 hover:text-red-700 transition duration-200 p-1 rounded-full hover:bg-red-100"
                        aria-label="Deletar item"
                    >
                        <Trash2 size={20} />
                    </button>
                    <ChevronDown
                        size={24}
                        className={`text-gray-500 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 animate-fade-in">
                    {isEditing ? (
                        <div className="mb-3">
                            <RichTextEditor
                                value={editedDescription}
                                onChange={setEditedDescription}
                                placeholder="Detalhes do item com formatação..."
                                disabled={false}
                            />
                        </div>
                    ) : (
                        item.description && (
                            <div
                                className="text-gray-700 mb-3 custom-richtext-area-display"
                                dangerouslySetInnerHTML={{ __html: item.description }}
                            ></div>
                        )
                    )}
                    {!item.description && !isEditing && (
                        <p className="text-gray-500 italic">Nenhuma descrição ou imagem para este item.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// Modal de Confirmação genérico
const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <Modal title={title} onClose={onCancel}>
        <div className="p-6">
            <p className="text-gray-700 mb-6 text-lg">{message}</p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-200"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                >
                    Confirmar
                </button>
            </div>
        </div>
    </Modal>
);

export default App;