const API_BASE_URL = 'http://192.168.100.8:3000';

export async function fetchInstagramProfile(username: string) {
    const response = await fetch(`${API_BASE_URL}/api/instagram/${username}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'No se pudo obtener la información');
    }

    return response.json();
}

export async function fetchPostDetail(postUrl: string) {
    const response = await fetch(
        `${API_BASE_URL}/api/post-detail?url=${encodeURIComponent(postUrl)}`
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'No se pudo obtener el detalle del post');
    }

    return response.json();
}