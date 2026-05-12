import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CloudUpload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GemLoadingSpinner from "@/components/gem-loading-spinner";
import { databases, storage, DB_ID, TABLE_ID, BUCKET_ID, ID } from "@/lib/appwrite";

const uploadSchema = z.object({
  referenceNumber: z.string().min(1, "Reference number is required"),
  caratWeight: z.string().optional(),
  colorGrade: z.string().optional(),
  clarityGrade: z.string().optional(),
  cutGrade: z.string().optional(),
  gemType: z.string().optional(),
  shape: z.string().optional(),
  measurements: z.string().optional(),
  polish: z.string().optional(),
  symmetry: z.string().optional(),
  fluorescence: z.string().optional(),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface UploadFormProps {
  onSuccess: () => void;
}

export default function UploadFormComponent({ onSuccess }: UploadFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      referenceNumber: "",
      caratWeight: "",
      colorGrade: "",
      clarityGrade: "",
      cutGrade: "",
      gemType: "Diamond",
      shape: "",
      measurements: "",
      polish: "",
      symmetry: "",
      fluorescence: "",
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('certificateFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const onSubmit = async (data: UploadForm) => {
    if (!selectedFile) {
      toast({ title: "File Required", description: "Please select a certificate file to upload", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload file to Appwrite Storage
      const uploaded = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        selectedFile
      );

      // 2. Create certificate document in Appwrite Database
      await databases.createDocument(DB_ID, TABLE_ID, ID.unique(), {
        reportNumber:   data.referenceNumber,
        referenceNumber: data.referenceNumber,
        reportDate:     new Date().toISOString(),
        shape:          data.shape          || "Round",
        measurements:   data.measurements   || "N/A",
        caratWeight:    data.caratWeight    || "0",
        colorGrade:     data.colorGrade     || "G",
        clarityGrade:   data.clarityGrade   || "VS1",
        cutGrade:       data.cutGrade       || "Good",
        polish:         data.polish         || "Good",
        symmetry:       data.symmetry       || "Good",
        fluorescence:   data.fluorescence   || "None",
        gemologistName: "GIL Certified Gemologist",
        signatureDate:  new Date().toISOString(),
        gemType:        data.gemType        || "Diamond",
        certificationDate: new Date().toISOString(),
        examinedBy:     "GIL Certified Gemologist",
        approvedBy:     "GIL Laboratory Director",
        filename:       uploaded.$id,        // store Appwrite file ID
        isActive:       true,
        verifierUrl:    "https://gilab.info/verify",
      });

      toast({ title: "Upload Successful", description: "Certificate has been uploaded successfully" });
      form.reset();
      clearFile();
      onSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      const isDuplicate = error?.code === 409 || error?.message?.includes('409');
      toast({
        title: "Upload Failed",
        description: isDuplicate
          ? "Reference number already exists"
          : error?.message || "An error occurred while uploading the certificate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-lg border border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <CloudUpload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload New Certificate</h2>
            <p className="text-gray-600">Add a new diamond certificate to the database</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Certificate Reference Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., GIL-2024-001234"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors"
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">Must be unique and follow GIL-YYYY-NNNNNN format</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Certificate File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-700 transition-colors cursor-pointer">
                <input type="file" id="certificateFile" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                {!selectedFile ? (
                  <div onClick={() => document.getElementById('certificateFile')?.click()}>
                    <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF, JPG, PNG files up to 50MB</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <CloudUpload className="w-6 h-6 text-blue-700" />
                    </div>
                    <p className="text-gray-600 font-medium">{selectedFile.name}</p>
                    <Button type="button" variant="link" onClick={clearFile} className="text-sm text-blue-700 hover:underline">
                      Change file
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="caratWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Carat Weight</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="1.52"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="colorGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Color Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select Color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['D','E','F','G','H','I','J'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="clarityGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Clarity Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select Clarity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cutGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Cut Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select Cut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Excellent','Very Good','Good','Fair','Poor'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => { form.reset(); clearFile(); }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                Clear Form
              </Button>
              <Button type="submit" disabled={isLoading}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2">
                {isLoading ? <GemLoadingSpinner size="sm" /> : <Plus className="w-5 h-5" />}
                <span>{isLoading ? "Uploading..." : "Upload Certificate"}</span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
