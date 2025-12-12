import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type Synonym = {
  word: string;
  context: string;
};

type Replacement = {
  id: string;
  original: string;
  replacement: string;
  timestamp: Date;
};

type TextMetrics = {
  wordCount: number;
  uniqueWords: number;
  avgWordLength: number;
  repetitionScore: number;
  rareWordsDensity: number;
};

const mockSynonyms: Record<string, Synonym[]> = {
  'light': [
    { word: 'illumination', context: 'radiation, brightness' },
    { word: 'radiance', context: 'glow, luminescence' },
    { word: 'weightless', context: 'for weight context' },
    { word: 'pale', context: 'for color context' }
  ],
  'создать': [
    { word: 'сформировать', context: 'образовать, построить' },
    { word: 'разработать', context: 'спроектировать' },
    { word: 'организовать', context: 'учредить, основать' }
  ],
  'быстрый': [
    { word: 'скорый', context: 'стремительный' },
    { word: 'проворный', context: 'ловкий, шустрый' },
    { word: 'оперативный', context: 'срочный, экстренный' }
  ],
  'текст': [
    { word: 'содержание', context: 'контент' },
    { word: 'материал', context: 'документ' },
    { word: 'документ', context: 'файл, запись' }
  ]
};

const Index = () => {
  const [text, setText] = useState('');
  const [selectedWord, setSelectedWord] = useState('');
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDirection, setSearchDirection] = useState('ru-ru');
  const [metrics, setMetrics] = useState<TextMetrics | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  const calculateMetrics = (textContent: string): TextMetrics => {
    const words = textContent.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount || 0;
    
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const repeatedWords = Object.values(wordFreq).filter(count => count > 1).length;
    const repetitionScore = (repeatedWords / uniqueWords) * 100 || 0;
    
    const longWords = words.filter(word => word.length > 7).length;
    const rareWordsDensity = (longWords / wordCount) * 100 || 0;

    return {
      wordCount,
      uniqueWords,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      repetitionScore: Math.round(repetitionScore),
      rareWordsDensity: Math.round(rareWordsDensity)
    };
  };

  useEffect(() => {
    if (text) {
      setMetrics(calculateMetrics(text));
    } else {
      setMetrics(null);
    }
  }, [text]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPopupPosition(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText && /^[a-zA-Zа-яА-ЯёЁ]+$/.test(selectedText)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedWord(selectedText.toLowerCase());
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });

      const foundSynonyms = mockSynonyms[selectedText.toLowerCase()] || [];
      setSynonyms(foundSynonyms);
    }
  };

  const handleReplaceWord = (replacement: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    const newText = text.replace(new RegExp(`\\b${selectedWord}\\b`, 'i'), replacement);
    setText(newText);

    const newReplacement: Replacement = {
      id: Date.now().toString(),
      original: selectedWord,
      replacement,
      timestamp: new Date()
    };
    setReplacements(prev => [newReplacement, ...prev]);

    setPopupPosition(null);
    setSelectedWord('');
    toast.success('Слово заменено');
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    const foundSynonyms = mockSynonyms[searchTerm.toLowerCase()] || [];
    setSynonyms(foundSynonyms);
    setSelectedWord(searchTerm.toLowerCase());
    toast.info(`Найдено ${foundSynonyms.length} синонимов`);
  };

  const exportToText = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synapse-text.txt';
    a.click();
    toast.success('Текст экспортирован');
  };

  const exportReplacements = () => {
    const replacementsText = replacements
      .map(r => `${r.original} → ${r.replacement} (${r.timestamp.toLocaleString()})`)
      .join('\n');
    
    const blob = new Blob([replacementsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synapse-replacements.txt';
    a.click();
    toast.success('История замен экспортирована');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Zap" className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Synapse</h1>
              <p className="text-xs text-muted-foreground">Интерактивный Тезаурус</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToText}>
              <Icon name="Download" size={16} className="mr-2" />
              Экспорт текста
            </Button>
            <Button variant="outline" size="sm" onClick={exportReplacements}>
              <Icon name="FileText" size={16} className="mr-2" />
              Экспорт замен
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Редактор текста</CardTitle>
                  <Badge variant="secondary">
                    {text.split(/\s+/).filter(Boolean).length} слов
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => setText(e.currentTarget.textContent || '')}
                  onMouseUp={handleTextSelection}
                  className="editor-content min-h-[400px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-lg"
                  placeholder="Начните вводить или вставьте текст..."
                  suppressContentEditableWarning
                >
                  {text}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  💡 Выделите любое слово для поиска синонимов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Классический поиск</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Введите слово для поиска..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <select
                    className="px-3 py-2 border rounded-md bg-card"
                    value={searchDirection}
                    onChange={(e) => setSearchDirection(e.target.value)}
                  >
                    <option value="ru-ru">RU → RU (Синонимы)</option>
                    <option value="en-en">EN → EN (Synonyms)</option>
                    <option value="ru-en">RU → EN (Перевод)</option>
                    <option value="en-ru">EN → RU (Translation)</option>
                  </select>
                  <Button onClick={handleSearch}>
                    <Icon name="Search" size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Метрики текста</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.wordCount}</div>
                      <div className="text-sm text-muted-foreground">Всего слов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.uniqueWords}</div>
                      <div className="text-sm text-muted-foreground">Уникальных</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.avgWordLength}</div>
                      <div className="text-sm text-muted-foreground">Средняя длина</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.repetitionScore}%</div>
                      <div className="text-sm text-muted-foreground">Повторяемость</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.rareWordsDensity}%</div>
                      <div className="text-sm text-muted-foreground">Редкие слова</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <aside className={`w-80 border-l bg-card transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="sticky top-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Боковая панель</h2>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Icon name={sidebarOpen ? 'ChevronRight' : 'ChevronLeft'} size={18} />
              </Button>
            </div>

            <Tabs defaultValue="synonyms" className="p-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="synonyms">Синонимы</TabsTrigger>
                <TabsTrigger value="history">История</TabsTrigger>
              </TabsList>

              <TabsContent value="synonyms" className="space-y-4">
                {selectedWord ? (
                  <>
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground">Выбранное слово</p>
                      <p className="text-lg font-semibold">{selectedWord}</p>
                    </div>

                    <ScrollArea className="h-[500px]">
                      {synonyms.length > 0 ? (
                        <div className="space-y-2">
                          {synonyms.map((syn, idx) => (
                            <Card key={idx} className="p-3 cursor-pointer hover:bg-accent transition-colors">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{syn.word}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{syn.context}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReplaceWord(syn.word)}
                                >
                                  <Icon name="ArrowRight" size={16} />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Синонимы не найдены
                        </p>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Выделите слово в тексте или используйте поиск
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history">
                <ScrollArea className="h-[500px]">
                  {replacements.length > 0 ? (
                    <div className="space-y-2">
                      {replacements.map((rep) => (
                        <Card key={rep.id} className="p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground line-through">{rep.original}</span>
                            <Icon name="ArrowRight" size={14} className="text-primary" />
                            <span className="font-medium">{rep.replacement}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rep.timestamp.toLocaleString('ru-RU')}
                          </p>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      История замен пуста
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      </div>

      {popupPosition && synonyms.length > 0 && (
        <div
          className="fixed z-50 animate-fade-in"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <Card className="w-64 shadow-lg">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Синонимы для "{selectedWord}"</p>
              {synonyms.slice(0, 3).map((syn, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleReplaceWord(syn.word)}
                >
                  {syn.word}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;
