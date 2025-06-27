document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('artworks-list');
    const noMsg = document.getElementById('no-artworks-message');
    if (!list) return;

    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>';
    list.style.display = 'grid';
    if (noMsg) noMsg.style.display = 'none';

    // 1) Сначала получаем все картины
    fetch('/api/v1/artworks')
        .then(res => res.json())
        .then(artJson => {
            const artworks = (artJson.status === 'success' && Array.isArray(artJson.data.artworks))
                ? artJson.data.artworks
                : [];

            if (!artworks.length) {
                list.style.display = 'none';
                if (noMsg) noMsg.style.display = 'block';
                return;
            }

            // 2) Параллельно для каждой картины запрашиваем её выставки
            const exhibitionsPromises = artworks.map(a =>
                fetch(`/api/v1/artworks/${a.id}/exhibitions`)
                    .then(r => r.json())
                    .then(json => (json.status === 'success' && Array.isArray(json.data.exhibitions))
                        ? json.data.exhibitions
                        : []
                    )
            );

            // 3) Когда все запросы завершатся — рендерим карточки
            Promise.all(exhibitionsPromises)
                .then(allExhibitions => {
                    list.innerHTML = '';
                    list.style.display = 'grid';
                    if (noMsg) noMsg.style.display = 'none';

                    artworks.forEach((a, idx) => {
                        const card = document.createElement('div');
                        card.className = 'card';
                        card.style.display = 'flex';
                        card.style.flexDirection = 'column';
                        card.style.justifyContent = 'space-between';

                        // HTML для списка выставок (если их несколько — разделяем запятыми)
                        const exhibitions = allExhibitions[idx];
                        const exhibitionsHTML = exhibitions.length
                            ? exhibitions
                                .map(e => `<a href="/exhibitions/${e.id}/page" class="text-blue-600 hover:underline">${e.title}</a>`)
                                .join(', ')
                            : '—';

                        card.innerHTML = `
              <div class="card-header" style="padding:1rem;">
                <h4 class="text-lg font-semibold">${a.title}</h4>
              </div>
              ${a.image_path
                            ? `<img src="${a.image_path}"
                        class="artwork-image"
                        style="width:100%; height:180px; object-fit:cover;"
                        alt="${a.title}">`
                            : ''}
              <div class="card-body" style="padding:1rem; flex-grow:1;">
                <p><strong>ID:</strong> ${a.id}</p>
                <p><strong>Размеры:</strong> ${a.width} × ${a.height} см</p>
                <p><strong>Год создания:</strong> ${a.creation_year}</p>
                <p><strong>Автор:</strong> ${a.Author.surname} ${a.Author.first_name} ${a.Author.patronymic || ''}</p>
                <p><strong>Стиль:</strong> ${a.Style.name}</p>
                <p><strong>Жанр:</strong> ${a.Genre.name}</p>
                <p class="mt-2"><strong>Описание:</strong> ${a.description || '—'}</p>
                <p class="mt-2">
                  <strong>Выставки:</strong> ${exhibitionsHTML}
                </p>
              </div>
            `;
                        list.appendChild(card);
                    });
                })
                .catch(err => {
                    console.error('Ошибка при загрузке выставок для картин:', err);
                    list.style.display = 'none';
                    if (noMsg) noMsg.style.display = 'block';
                });
        })
        .catch(err => {
            console.error('Ошибка при загрузке картин:', err);
            list.style.display = 'none';
            if (noMsg) noMsg.style.display = 'block';
        });
});
