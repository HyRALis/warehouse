import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FileDropzone } from '@inventory-system/ui';

const FileDropzoneDemo = () => {
    const [file, setFile] = useState<File | null>(null);
    return <div className="max-w-sm space-y-3"><FileDropzone id="story-image" label="Upload product image" description="JPEG or WebP, up to 2 MB" accept="image/jpeg,image/webp" onFileChange={setFile} />{file && <p role="status" className="text-sm text-emerald-400">Selected: {file.name}</p>}</div>;
};

const meta = {
    title: 'Shared UI/Forms/File Dropzone',
    component: FileDropzone,
    args: {
        label: 'Upload a file',
        onFileChange: fn(),
    },
} satisfies Meta<typeof FileDropzone>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ImageUpload: Story = {
    render: () => <FileDropzoneDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.upload(canvas.getByLabelText('Upload product image'), new File(['image'], 'headphones.webp', { type: 'image/webp' }));
        await expect(canvas.getByText('Selected: headphones.webp')).toBeVisible();
    },
};
