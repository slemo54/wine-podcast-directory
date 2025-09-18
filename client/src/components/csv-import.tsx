import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ImportResult {
  success: boolean;
  imported: number;
  duplicatesSkipped: number;
  updated: number;
  errors: number;
  errorMessages: string[];
  totalRows?: number;
  headers?: string[];
  podcasts?: any[];
  updatedPodcasts?: any[];
  overwriteMode?: boolean;
}

export function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const url = new URL('/api/podcasts/import', window.location.origin);
      if (overwriteDuplicates) {
        url.searchParams.append('overwrite', 'true');
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      let description = `${data.imported} new podcasts imported.`;
      if (data.duplicatesSkipped > 0) {
        description += ` ${data.duplicatesSkipped} duplicates skipped.`;
      }
      if (data.updated > 0) {
        description += ` ${data.updated} existing podcasts updated.`;
      }
      if (data.errors > 0) {
        description += ` ${data.errors} rows had errors.`;
      }
      
      toast({
        title: "Import Completed!",
        description,
      });
      
      setFile(null);
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "There was an error importing your CSV file. Please check the format and try again.",
        variant: "destructive",
      });
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-2xl text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Import Podcast Data</h2>
          <p className="text-muted-foreground">Upload a CSV file to add new podcasts to the directory</p>
        </div>

        {/* CSV Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
            dragActive
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          data-testid="csv-dropzone"
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {file ? file.name : "Drop your CSV file here"}
          </h3>
          <p className="text-muted-foreground mb-4">or click to browse</p>
          
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            data-testid="input-csv-file"
          />
          
          <Button onClick={triggerFileInput} data-testid="button-choose-file">
            Choose File
          </Button>
        </div>

        {/* Overwrite Option */}
        {file && (
          <div className="bg-muted rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <Checkbox
                id="overwrite-duplicates"
                checked={overwriteDuplicates}
                onCheckedChange={(checked) => setOverwriteDuplicates(checked as boolean)}
                data-testid="checkbox-overwrite-duplicates"
              />
              <label
                htmlFor="overwrite-duplicates"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Update existing podcasts with same title and host
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {overwriteDuplicates 
                ? "Existing podcasts will be updated with new data from the CSV" 
                : "Duplicate podcasts will be skipped during import"}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                data-testid="button-import-csv"
                className="flex items-center gap-2"
              >
                {overwriteDuplicates && <RefreshCw className="w-4 h-4" />}
                {importMutation.isPending ? "Importing..." : "Import CSV"}
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {importMutation.isPending && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Processing CSV file...</span>
            </div>
            <Progress value={65} className="mb-2" />
            <p className="text-sm text-muted-foreground">Validating and importing podcast data</p>
          </div>
        )}

        {/* Upload Results */}
        {importMutation.data && (
          <div className={`border rounded-lg p-4 mb-6 ${
            importMutation.data.imported > 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {importMutation.data.imported > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <span className={`font-medium ${
                importMutation.data.imported > 0 ? 'text-green-800' : 'text-orange-800'
              }`}>
                {importMutation.data.imported > 0 ? 'Import Successful!' : 'Import Issues Found'}
              </span>
            </div>
            
            <div className={`text-sm mb-3 ${
              importMutation.data.imported > 0 ? 'text-green-700' : 'text-orange-700'
            }`}>
              <p>• Total rows processed: {importMutation.data.totalRows || 0}</p>
              <p>• New podcasts imported: {importMutation.data.imported}</p>
              {importMutation.data.duplicatesSkipped > 0 && (
                <p>• Duplicates skipped: {importMutation.data.duplicatesSkipped}</p>
              )}
              {importMutation.data.updated > 0 && (
                <p>• Existing podcasts updated: {importMutation.data.updated}</p>
              )}
              {importMutation.data.errors > 0 && (
                <p>• Rows with errors: {importMutation.data.errors}</p>
              )}
              {importMutation.data.overwriteMode && (
                <p className="text-xs mt-1 opacity-75">• Overwrite mode was enabled</p>
              )}
            </div>

            {importMutation.data.headers && (
              <details className="mb-3">
                <summary className={`cursor-pointer text-sm font-medium ${
                  importMutation.data.imported > 0 ? 'text-green-700' : 'text-orange-700'
                } hover:opacity-80`}>
                  View CSV Headers ({importMutation.data.headers.length} columns)
                </summary>
                <div className={`mt-2 p-2 rounded text-xs font-mono ${
                  importMutation.data.imported > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {importMutation.data.headers.join(', ')}
                </div>
              </details>
            )}
            
            {importMutation.data.errorMessages.length > 0 && (
              <details className="mt-2">
                <summary className={`cursor-pointer text-sm font-medium ${
                  importMutation.data.imported > 0 ? 'text-green-700' : 'text-orange-700'
                } hover:opacity-80`}>
                  View Error Details ({importMutation.data.errorMessages.length} errors)
                </summary>
                <div className={`mt-2 max-h-32 overflow-y-auto p-2 rounded text-xs font-mono ${
                  importMutation.data.imported > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {importMutation.data.errorMessages.map((error, index) => (
                    <div key={index} className="mb-1">• {error}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* CSV Format Guide */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            Required CSV Format
          </h4>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Your CSV file should include these columns:</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <span>• Podcast Title</span>
              <span>• Podcast Host(s)</span>
              <span>• Country of Production</span>
              <span>• Primary Language(s)</span>
              <span>• Year Launched</span>
              <span>• Is currently active?</span>
              <span>• Categories</span>
              <span>• Episode Length</span>
            </div>
            <p className="mt-2 text-xs">
              Optional columns: Description, Episodes, Spotify URL, Instagram URL, YouTube URL, Website URL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
