document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('artworks-list');
    const noListMsg = document.getElementById('no-artworks-message');
    const tableBody = document.getElementById('artworksTableBody');

    // Helper to fetch artworks
    function fetchArtworks() {
        return fetch('/api/v1/artworks')
            .then(res => res.json())
            .then(json => (json.status === 'success' && Array.isArray(json.data.artworks))
                ? json.data.artworks
                : []
            );
    }

    // Rendering as card list (public page)
    if (list) {
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>';
        list.style.display = 'grid';
        if (noListMsg) noListMsg.style.display = 'none';

        fetchArtworks()
            .then(artworks => {
                if (!artworks.length) {
                    list.style.display = 'none';
                    if (noListMsg) noListMsg.style.display = 'block';
                    return;
                }

                const exhibitionsPromises = artworks.map(a =>
                    fetch(`/api/v1/artworks/${a.id}/exhibitions`)
                        .then(r => r.json())
                        .then(json => Array.isArray(json.data?.exhibitions) ? json.data.exhibitions : [])
                        .catch(() => [])
                );

                Promise.all(exhibitionsPromises)
                    .then(allExhibitions => {
                        list.innerHTML = '';
                        list.style.display = 'grid';
                        if (noListMsg) noListMsg.style.display = 'none';

                        artworks.forEach((a, idx) => {
                            const card = document.createElement('div');
                            card.className = 'card';
                            card.style.display = 'flex';
                            card.style.flexDirection = 'column';
                            card.style.justifyContent = 'space-between';

                            const exhibitions = allExhibitions[idx] || [];
                            const exhibitionsHTML = exhibitions.length
                                ? exhibitions.map(e => `<a href="/exhibitions/${e.id}/page" class="text-blue-600 hover:underline">${e.title}</a>`).join(', ')
                                : '—';

                            card.innerHTML = `
                <div class="card-header" style="padding:1rem;">
                  <h4 class="text-lg font-semibold">${a.title}</h4>
                </div>
                ${a.image_path
                                ? `<img src="${a.image_path}" class="artwork-image" style="width:100%; height:180px; object-fit:cover;" alt="${a.title}">`
                                : ''}
                <div class="card-body" style="padding:1rem; flex-grow:1;">
                  <p><strong>ID:</strong> ${a.id}</p>
                  <p><strong>Размеры:</strong> ${a.width} × ${a.height} см</p>
                  <p><strong>Год создания:</strong> ${a.creation_year}</p>
                  <p><strong>Автор:</strong> ${a.Author?.surname || ''} ${a.Author?.first_name || ''} ${a.Author?.patronymic || ''}</p>
                  <p><strong>Стиль:</strong> ${a.Style?.name || ''}</p>
                  <p><strong>Жанр:</strong> ${a.Genre?.name || ''}</p>
                  <p class="mt-2"><strong>Описание:</strong> ${a.description || '—'}</p>
                  <p class="mt-2"><strong>Выставки:</strong> ${exhibitionsHTML}</p>
                </div>
              `;
                            list.appendChild(card);
                        });
                    })
                    .catch(err => {
                        console.error('Ошибка при загрузке выставок:', err);
                        list.style.display = 'none';
                        if (noListMsg) noListMsg.style.display = 'block';
                    });
            })
            .catch(err => {
                console.error('Ошибка при загрузке картин:', err);
                list.style.display = 'none';
                if (noListMsg) noListMsg.style.display = 'block';
            });

        return;
    }

    // Rendering as admin table
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Загрузка...</td></tr>';

        fetchArtworks()
            .then(artworks => {
                if (!artworks.length) {
                    tableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Нет данных для отображения.</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';
                artworks.forEach(a => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
              <td>${a.id}</td>
              <td>${a.image_path ? `<img src="${a.image_path}" alt="${a.title}" style="height:40px">` : ''}</td>
              <td>${a.title}</td>
              <td>${a.Author?.surname || ''} ${a.Author?.first_name || ''}</td>
              <td>${a.Style?.name || ''}</td>
              <td>${a.Genre?.name || ''}</td>
              <td>${a.creation_year}</td>
              <td>${a.width}×${a.height} см</td>
              <td>${Array.isArray(a.Exhibitions) ? a.Exhibitions.length : 0}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="editArtwork(${a.id})">Изменить</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${a.id})">Удалить</button>
              </td>
            `;
                    tableBody.appendChild(row);
                });
            })
            .catch(err => {
                console.error('Ошибка при загрузке картин:', err);
                tableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Не удалось загрузить данные</td></tr>';
            });
    }
});
