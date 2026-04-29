import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadToR2 } from '../lib/r2';
import { Search, Plus, Copy, Check, Upload, Trash2, ExternalLink, Image as ImageIcon, Filter, X, CloudRain, Database, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import Cropper from 'react-easy-crop';
import { getCroppedImgBlob } from '../lib/crop';

export function MediaGallery() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, uploaded, question
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch Images
    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        setLoading(true);
        try {
            // Fetch from the new Node.js/MongoDB media registry
            const response = await fetch('http://localhost:5000/api/media');
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Sort by created_at descending
            const sortedData = (result.data || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setImages(sortedData);
        } catch (err) {
            console.error("Error fetching media registry:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        // You could add a toast here
        alert("URL copied to clipboard!");
    };

    const filteredImages = images.filter(img => {
        if (searchTerm && !img.url.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Media Gallery</h1>
                    <p className="text-sm text-slate-500">Manage and view all images used in questions.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Media
                </button>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search URL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Filter className="w-4 h-4" />
                    <span>{filteredImages.length} images found</span>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading media...</div>
                ) : filteredImages.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">No images found matching your search.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredImages.map((img, idx) => (
                            <div key={idx} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                    <img
                                        src={img.url}
                                        alt="Gallery Item"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.src = 'https://placehold.co/400x400?text=Broken+Image';
                                            e.target.className = "w-full h-full object-cover opacity-50";
                                        }}
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleCopy(img.url)}
                                            className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-900 transition-colors"
                                            title="Copy URL"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <a
                                            href={img.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-900 transition-colors"
                                            title="Open Original"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="text-[10px] font-bold text-slate-900 truncate mb-0.5" title={img.name}>{img.name || 'Untitled Image'}</div>
                                    <div className="text-[9px] text-slate-400 truncate mb-2" title={img.url}>{img.url}</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            {img.type ? img.type.split('/')[1]?.toUpperCase() : 'IMAGE'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {img.created_at ? new Date(img.created_at).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Media Modal */}
            {showAddModal && (
                <AddMediaModal
                    onClose={() => setShowAddModal(false)}
                    onUploaded={() => {
                        fetchImages();
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
}

function AddMediaModal({ onClose, onUploaded }) {
    const [tab, setTab] = useState('url'); // url, upload
    const [url, setUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [provider, setProvider] = useState('supabase'); // supabase, r2
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [bulkErrors, setBulkErrors] = useState([]);

    // Cropping Flow
    const [pendingFiles, setPendingFiles] = useState([]); // { file, previewUrl, crop, zoom, croppedBlob }
    const [currentCropIndex, setCurrentCropIndex] = useState(-1);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [isR2Configured, setIsR2Configured] = useState(false);
    useEffect(() => {
        setIsR2Configured(!!(import.meta.env.VITE_R2_ACCOUNT_ID && import.meta.env.VITE_R2_BUCKET_NAME));
        if (!!(import.meta.env.VITE_R2_ACCOUNT_ID && import.meta.env.VITE_R2_BUCKET_NAME)) setProvider('r2');
    }, []);
    
    // Dimension & Aspect Settings
    const [targetDim, setTargetDim] = useState('original'); // 'original', '200', '400', '800'
    const [aspect, setAspect] = useState(null); // null is Free

    const handleUrlSubmit = async () => {
        if (url) {
            try {
                const response = await fetch('http://localhost:5000/api/media/bulk-upload-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: [url] })
                });
                const resJson = await response.json();
                if (resJson.error) throw new Error(resJson.error.message);
                onUploaded();
            } catch (err) {
                console.error("Failed to register URL:", err);
                setError("Failed to register URL in registry.");
            }
        }
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const filesWithPreviews = [];
        for (const file of selectedFiles) {
            const previewUrl = URL.createObjectURL(file);
            
            // Auto-detect aspect ratio for "Full Image" default
            let detectedAspect = 1;
            try {
                const img = new Image();
                img.src = previewUrl;
                await new Promise((resolve) => {
                    img.onload = () => {
                        detectedAspect = img.width / img.height;
                        resolve();
                    };
                });
            } catch (e) { console.error(e); }

            filesWithPreviews.push({
                file,
                previewUrl,
                crop: { x: 0, y: 0 },
                zoom: 1,
                name: file.name,
                detectedAspect
            });
        }

        setPendingFiles(filesWithPreviews);
        setAspect(filesWithPreviews[0].detectedAspect);
        setCurrentCropIndex(0);
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleNextCrop = async () => {
        try {
            const currentFile = pendingFiles[currentCropIndex];
            
            let tW = null;
            let tH = null;
            
            if (targetDim !== 'original') {
                const size = parseInt(targetDim);
                if (aspect) {
                    tW = size;
                    tH = Math.round(size / aspect);
                } else {
                    // For free aspect, we can just cap the largest dimension
                    const scale = Math.min(1, size / Math.max(croppedAreaPixels.width, croppedAreaPixels.height));
                    tW = Math.round(croppedAreaPixels.width * scale);
                    tH = Math.round(croppedAreaPixels.height * scale);
                }
            }

            const croppedBlob = await getCroppedImgBlob(currentFile.previewUrl, croppedAreaPixels, 0, { horizontal: false, vertical: false }, tW, tH);
            
            const updatedFiles = [...pendingFiles];
            updatedFiles[currentCropIndex] = {
                ...currentFile,
                croppedBlob
            };
            setPendingFiles(updatedFiles);

            if (currentCropIndex < pendingFiles.length - 1) {
                setCurrentCropIndex(currentCropIndex + 1);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
            } else {
                // All cropped, start upload
                setCurrentCropIndex(-1);
                handleBulkUpload(updatedFiles);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to crop image");
        }
    };

    const handleBulkUpload = async (filesToUpload) => {
        setUploading(true);
        setError(null);
        setBulkErrors([]);
        setProgress({ current: 0, total: filesToUpload.length });

        for (let i = 0; i < filesToUpload.length; i++) {
            const item = filesToUpload[i];
            const file = item.croppedBlob || item.file;
            const originalName = item.name || "image.jpg";

            try {
                // Standardize filename
                const fileExt = originalName.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

                let publicUrl = '';

                if (provider === 'r2') {
                    const path = fileName;
                    publicUrl = await uploadToR2(file, path);
                } else {
                    // Supabase Storage
                    const filePath = `${fileName}`;
                    const { error: uploadError } = await supabase.storage
                        .from('images') // Assumption!
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl: sbUrl } } = supabase.storage
                        .from('images')
                        .getPublicUrl(filePath);
                    publicUrl = sbUrl;
                }

                // Register in MongoDB Media Table
                const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, " ") || "Uploaded Image";
                await fetch('http://localhost:5000/api/media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: cleanName,
                        url: publicUrl,
                        type: item.file.type
                    })
                });

                setProgress(prev => ({ ...prev, current: i + 1 }));

            } catch (err) {
                console.error(`Upload failed for ${originalName}:`, err);
                setBulkErrors(prev => [...prev, `${originalName}: ${err.message}`]);
            }
        }

        if (bulkErrors.length === 0) {
            onUploaded();
        } else {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-900">
                        {currentCropIndex !== -1 ? `Crop Image (${currentCropIndex + 1}/${pendingFiles.length})` : 'Add New Media'}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {currentCropIndex !== -1 ? (
                        <div className="space-y-6">
                            <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden">
                                <Cropper
                                    key={aspect}
                                    image={pendingFiles[currentCropIndex].previewUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={aspect || undefined}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    showGrid={true}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aspect Ratio</label>
                                        <div className="flex gap-1">
                                            {[
                                                { label: '1:1', val: 1 },
                                                { label: '4:3', val: 1.33 },
                                                { label: '16:9', val: 1.77 },
                                                { label: 'Wide', val: 3 },
                                                { label: 'Free', val: null }
                                            ].map(opt => (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => setAspect(opt.val)}
                                                    className={cn(
                                                        "flex-1 py-1.5 text-[10px] font-bold rounded border transition-all",
                                                        aspect === opt.val 
                                                            ? "bg-brand-600 border-brand-600 text-white" 
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Dimension</label>
                                        <select
                                            value={targetDim}
                                            onChange={(e) => setTargetDim(e.target.value)}
                                            className="w-full py-1.5 px-2 text-[10px] font-bold rounded border border-slate-200 bg-white text-slate-600 focus:ring-1 focus:ring-brand-500 outline-none"
                                        >
                                            <option value="original">Original (Full Quality)</option>
                                            <option value="200">200px (Icons)</option>
                                            <option value="400">400px (Standard MCQ)</option>
                                            <option value="800">800px (High Res)</option>
                                            <option value="1200">1200px (Large)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Zoom</span>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(e.target.value)}
                                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                    />
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                                        {pendingFiles[currentCropIndex].name}
                                    </div>
                                    <button
                                        onClick={handleNextCrop}
                                        className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 active:scale-95"
                                    >
                                        {currentCropIndex === pendingFiles.length - 1 ? "FINISH & UPLOAD" : "NEXT IMAGE"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ) : (
                        <>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setTab('url')}
                            className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", tab === 'url' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            External URL
                        </button>
                        <button
                            onClick={() => setTab('upload')}
                            className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", tab === 'upload' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            Upload File
                        </button>
                    </div>

                    {tab === 'url' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                                <input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/image.png"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            {url && (
                                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={url} className="w-full h-full object-contain" alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Provider Toggle */}
                            <div className="flex items-center gap-4 mb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        checked={provider === 'supabase'}
                                        onChange={() => setProvider('supabase')}
                                        className="text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-slate-500" /> Supabase</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        checked={provider === 'r2'}
                                        onChange={() => setProvider('r2')}
                                        className="text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="flex items-center gap-1.5"><Cloud className="w-4 h-4 text-slate-500" /> Cloudflare R2</span>
                                </label>
                            </div>

                            {!isR2Configured && provider === 'r2' && (
                                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Warning: R2 credentials are missing in <code>.env</code>. Uploads will likely fail.</span>
                                </div>
                            )}

                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Upload Failed</p>
                                        <p className="text-xs mt-1 opacity-90">{error}</p>
                                    </div>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-brand-500 transition-all bg-slate-50/50 relative">
                                {uploading ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                            <p className="text-sm font-medium text-slate-900">Uploading {progress.current} of {progress.total} files...</p>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div 
                                                className="bg-brand-600 h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Upload className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm text-slate-600 mb-1 font-medium">Click to select multiple files</p>
                                        <p className="text-xs text-slate-400">PNG, JPG, SVG or GIF</p>
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileSelect}
                                            accept="image/*"
                                        />
                                    </>
                                )}
                            </div>

                            {bulkErrors.length > 0 && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-600 font-medium text-xs mb-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Some files failed:
                                    </div>
                                    <ul className="text-[10px] text-red-500 list-disc list-inside max-h-20 overflow-y-auto">
                                        {bulkErrors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            )}

                            {url && !uploading && !error && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Uploaded successfully!
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input value={url} readOnly className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 select-all" />
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(url);
                                            // You could add a toast here
                                        }} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded font-medium transition-colors">Copy</button>
                                    </div>
                                    <div className="mt-3 aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                        <img src={url} className="w-full h-full object-contain" alt="Uploaded Preview" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Close</button>
                    {url && (
                        <button onClick={() => {
                            navigator.clipboard.writeText(url);
                            onClose();
                        }} className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                            Copy & Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
