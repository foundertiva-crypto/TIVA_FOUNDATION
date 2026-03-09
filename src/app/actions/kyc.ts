"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadKycDocument(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const file = formData.get("document") as File;
    const documentType = formData.get("documentType") as string;

    if (!file || !documentType) {
        return { error: "Missing file or document type" };
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file);

    if (uploadError) {
        return { error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(fileName);

    // Create KYC document record
    const { error: dbError } = await supabase
        .from("kyc_documents")
        .insert({
            user_id: user.id,
            document_type: documentType,
            document_url: publicUrl,
            status: "pending",
        });

    if (dbError) {
        return { error: dbError.message };
    }

    return { success: true };
}

export async function getKycStatus() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return data;
}

export async function approveKyc(documentId: string, adminNotes?: string) {
    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await admin
        .from("kyc_documents")
        .update({
            status: "approved",
            admin_notes: adminNotes || null,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function rejectKyc(documentId: string, adminNotes: string) {
    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await admin
        .from("kyc_documents")
        .update({
            status: "rejected",
            admin_notes: adminNotes,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (error) return { error: error.message };
    return { success: true };
}
