import os

file_path = '/workspace/src/components/WeighStationModal.tsx'
if not os.path.exists(file_path):
    file_path = './src/components/WeighStationModal.tsx'

with open(file_path, 'r') as f:
    content = f.read()

broken_start = '                                        {/* Stabilit                    );'
broken_end = '                    )}'

idx_start = content.find(broken_start)
idx_end = content.find(broken_end, idx_start)

if idx_start == -1 or idx_end == -1:
    print('Error: Could not find start or end token')
    exit(1)

idx_end += len(broken_end)

clean_code = """                                        {/* Stability counter at the bottom of weight box */}
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 px-4 pt-4 border-t border-white/5 gap-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-3">
                                                {operatingMode === 'weigh' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsReverseMode(!isReverseMode);
                                                            toast.info(!isReverseMode ? "Switched to Direct Net Weight Input Mode" : "Switched to Gross Weight Input Mode");
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                            isReverseMode 
                                                                ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600' 
                                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-705'
                                                        }`}
                                                    >
                                                        <Scale size={10} className="stroke-[3]" />
                                                        {isReverseMode ? t('weigh.mode_reverse_active') : t('weigh.mode_standard')}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t('weigh.stability_trace')}</span>
                                                <div className="flex gap-1">
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} className={`w-6 h-1 rounded-full transition-all duration-500 ${stabilityCounter > i ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </InteractiveBlock>
                    );
                })()}"""

new_content = content[:idx_start] + clean_code + content[idx_end:]

with open(file_path, 'w') as f:
    f.write(new_content)

print('Success!')
