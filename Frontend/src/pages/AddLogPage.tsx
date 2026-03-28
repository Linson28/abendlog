import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { AbendLog } from '../types';
import { api } from '../services/api';

const FormField: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} autoComplete="off" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100" />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} autoComplete="off" rows={3} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
);

const CATEGORIES = [
  "Contention",
  "Data",
  "IPC",
  "JCL",
  "Space",
  "User",
  "Other"
];

const AddLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { year, log_number } = useParams<{ year: string, log_number: string }>();
  const location = useLocation();
  const logToCopy = location.state?.logToCopy as AbendLog | undefined;

  const isEditMode = !!(year && log_number);
  
  const [logData, setLogData] = useState<Partial<AbendLog>>({
    subsystem: '', composite: '', program: '', abend_code: '', job_name: '',
    job_number: '', step: '', abend_date: new Date().toISOString().split('T')[0], entered_by: '', se_name: '',
    description: '', files: '', category: CATEGORIES[0], problem_detail: '',
    resolution_steps: '', recovery_required: '', results_code: '', prevention_note: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [predictedLogNumber, setPredictedLogNumber] = useState<number | null>(null);

  useEffect(() => {
    if (isEditMode && year && log_number) {
      setIsLoading(true);
      api.getLog(parseInt(year, 10), parseInt(log_number, 10)).then(log => {
        if (log) {
          setLogData(log);
        } else {
          alert('Log not found!');
          navigate('/search');
        }
        setIsLoading(false);
      }).catch(() => {
          alert('Failed to fetch log details.');
          navigate('/search');
          setIsLoading(false);
      });
    } else if (logToCopy) {
      // Intentionally discard old log_id and log_number when copying
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { log_id, log_number, ...dataToCopy } = logToCopy;
      setLogData({
        ...dataToCopy,
        abend_date: new Date().toISOString().split('T')[0],
        description: `COPY OF: ${dataToCopy.description}`,
      });
    }
  }, [year, log_number, isEditMode, logToCopy, navigate]);

  useEffect(() => {
    if (isEditMode) return;

    let isMounted = true;
    const fetchNextLogNumber = async () => {
      if (!logData.abend_date) {
        if (isMounted) setPredictedLogNumber(null);
        return;
      }
      const currentYear = new Date(logData.abend_date).getFullYear();
      if (isNaN(currentYear)) {
        if (isMounted) setPredictedLogNumber(null);
        return;
      }
      
      if (isMounted) setPredictedLogNumber(null); // Show loading state
      try {
        const nextNumber = await api.getNextLogNumber(currentYear);
        if (isMounted) setPredictedLogNumber(nextNumber);
      } catch (error) {
        console.error("Failed to fetch next log number", error);
        if (isMounted) setPredictedLogNumber(null);
      }
    };

    fetchNextLogNumber();
    return () => { isMounted = false; };
  }, [isEditMode, logData.abend_date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLogData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!logData.subsystem || !logData.program || !logData.abend_code || !logData.abend_date) {
          alert('Please fill all required fields.');
          setIsSaving(false);
          return;
      }

      if (isEditMode && year && log_number) {
        await api.updateLog(parseInt(year, 10), parseInt(log_number, 10), logData);
        alert('Log updated successfully!');
        navigate('/search', { state: { refreshSearch: true } });
      } else {
        const { entered_by: _eb, ...newLogData } = logData;
        await api.addLog(newLogData as Omit<AbendLog, 'log_id' | 'log_number'>);
        alert('Log saved successfully!');
        navigate('/search', { state: { refreshSearch: true } });
      }
    } catch (error) {
      console.error("Failed to save log", error);
      alert('Failed to save log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading log details...</p>
          </div>
      );
  }
  
  const getLogNumberDisplayValue = () => {
    if (isEditMode) {
      return logData.log_number ? String(logData.log_number).padStart(4, '0') : '';
    }
    if (predictedLogNumber !== null) {
      return String(predictedLogNumber).padStart(4, '0');
    }
    return logData.abend_date ? '...' : '';
  };


  return (
    <div className="p-8 h-full overflow-y-auto fade-in">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Log Entry' : logToCopy ? 'Copy Log Entry' : 'Add New Log Entry'}</h1>
          <p className="mt-1 text-gray-600">
            {isEditMode ? 'Update the details of this abend incident.' : 'Document a new abend with detailed information'}
          </p>
        </header>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <FormField label="Log #" id="log_number"><Input id="log_number" name="log_number" type="text" placeholder="Auto-generated" value={getLogNumberDisplayValue()} disabled /></FormField>
              <FormField label="Subsystem" id="subsystem"><Input id="subsystem" name="subsystem" value={logData.subsystem} onChange={handleChange} required /></FormField>
              <FormField label="Composite" id="composite"><Input id="composite" name="composite" value={logData.composite} onChange={handleChange} /></FormField>
              <FormField label="Program" id="program"><Input id="program" name="program" value={logData.program} onChange={handleChange} required /></FormField>
              <FormField label="Abend Code" id="abend_code"><Input id="abend_code" name="abend_code" value={logData.abend_code} onChange={handleChange} required /></FormField>
              <FormField label="Job Name" id="job_name"><Input id="job_name" name="job_name" value={logData.job_name} onChange={handleChange} /></FormField>
              <FormField label="Job Number" id="job_number"><Input id="job_number" name="job_number" value={logData.job_number} onChange={handleChange} /></FormField>
              <FormField label="Step" id="step"><Input id="step" name="step" value={logData.step} onChange={handleChange} /></FormField>
              <FormField label="Abend Date" id="abend_date"><Input id="abend_date" name="abend_date" type="date" value={logData.abend_date} onChange={handleChange} required /></FormField>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Description" id="description"><Textarea id="description" name="description" value={logData.description} onChange={handleChange} /></FormField>
              <FormField label="Files" id="files"><Textarea id="files" name="files" value={logData.files} onChange={handleChange} /></FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="SE Name" id="se_name"><Input id="se_name" name="se_name" value={logData.se_name} onChange={handleChange} /></FormField>
              <FormField label="Category" id="category">
                <Select id="category" name="category" value={logData.category} onChange={handleChange}>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
              </FormField>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Detailed Analysis</h2>
            <div className="space-y-6">
              <FormField label="Problem" id="problem_detail"><Textarea id="problem_detail" name="problem_detail" value={logData.problem_detail} onChange={handleChange} /></FormField>
              <FormField label="Resolution" id="resolution_steps"><Textarea id="resolution_steps" name="resolution_steps" value={logData.resolution_steps} onChange={handleChange} /></FormField>
              <FormField label="Recovery" id="recovery_required"><Textarea id="recovery_required" name="recovery_required" value={logData.recovery_required} onChange={handleChange} /></FormField>
              <FormField label="Results" id="results_code"><Textarea id="results_code" name="results_code" value={logData.results_code} onChange={handleChange} /></FormField>
              <FormField label="Prevention" id="prevention_note"><Textarea id="prevention_note" name="prevention_note" value={logData.prevention_note} onChange={handleChange} /></FormField>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate('/search')} className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300">
              {isSaving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLogPage;