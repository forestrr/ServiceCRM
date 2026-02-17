import { supabase } from './supabase';

interface StepNotificationData {
    customerName: string;
    customerEmail?: string;
    customerWhatsapp?: string;
    stepName: string;
    stepNumber: number;
    totalSteps: number;
    completedSteps: number;
    progressPercent: number;
    serviceName: string;
    applicationId: string;
}

export async function notifyStepCompleted(data: StepNotificationData): Promise<{
    success: boolean;
    email: boolean;
    whatsapp: boolean;
}> {
    try {
        if (!data.customerEmail && !data.customerWhatsapp) {
            return { success: true, email: false, whatsapp: false };
        }

        const { data: result, error } = await supabase.functions.invoke('notify-customer', {
            body: data,
        });

        if (error) {
            console.error('Notification function error:', error);
            return { success: false, email: false, whatsapp: false };
        }

        return {
            success: true,
            email: result?.results?.email || false,
            whatsapp: result?.results?.whatsapp || false,
        };
    } catch (err) {
        console.error('Notification error:', err);
        return { success: false, email: false, whatsapp: false };
    }
}

export async function notifyNewlyCompletedSteps(params: {
    originalSteps: { id: string; label: string; is_completed: boolean; position: number }[];
    updatedSteps: { id: string; label: string; is_completed: boolean; position: number }[];
    customerName: string;
    customerEmail?: string;
    customerWhatsapp?: string;
    serviceName: string;
    applicationId: string;
}): Promise<void> {
    const { originalSteps, updatedSteps, customerName, customerEmail, customerWhatsapp, serviceName, applicationId } = params;

    const newlyCompleted = updatedSteps.filter(updated => {
        if (!updated.is_completed) return false;
        if (updated.id.startsWith('temp-')) return false;
        const original = originalSteps.find(o => o.id === updated.id);
        return original && !original.is_completed;
    });

    if (newlyCompleted.length === 0) return;

    const totalSteps = updatedSteps.length;
    const completedSteps = updatedSteps.filter(s => s.is_completed).length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    for (const step of newlyCompleted) {
        const sortedSteps = [...updatedSteps].sort((a, b) => a.position - b.position);
        const stepNumber = sortedSteps.findIndex(s => s.id === step.id) + 1;

        await notifyStepCompleted({
            customerName,
            customerEmail,
            customerWhatsapp,
            stepName: step.label,
            stepNumber,
            totalSteps,
            completedSteps,
            progressPercent,
            serviceName,
            applicationId,
        });
    }
}
