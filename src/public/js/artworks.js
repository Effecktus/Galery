// Глобальные переменные
let artworkCurrentSort = {
    column: 'id',
    direction: 'asc'
};

$(document).ready(function () {
    // Загрузка произведений при загрузке страницы
    loadArtworks();

    // Загрузка списков для выпадающих меню
    loadAuthors();
    loadStyles();
    loadGenres();

    // Переменная для хранения таймера
    let searchTimer;

    // Обработчик поиска при вводе
    $('#searchInput').on('input', function () {
        const searchTerm = $(this).val();

        // Очищаем предыдущий таймер
        clearTimeout(searchTimer);

        // Устанавливаем новый таймер
        searchTimer = setTimeout(() => {
            loadArtworks(searchTerm);
        }, 300); // Задержка 300мс
    });

    // Обработчики фильтрации по году создания
    $('#yearFrom, #yearTo').on('input', function() {
        loadArtworks();
    });

    // Обработчик очистки фильтра по году
    $('#clearYearFilter').on('click', function() {
        $('#yearFrom').val('');
        $('#yearTo').val('');
        loadArtworks();
    });

    // Обработчик клика по заголовкам таблицы
    $('.sortable').on('click', function() {
        const column = $(this).data('column');

        if (artworkCurrentSort.column === column) {
            artworkCurrentSort.direction = artworkCurrentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            artworkCurrentSort.column = column;
            artworkCurrentSort.direction = 'asc';
        }

        loadArtworks($('#searchInput').val());
    });

    // Обработчик добавления произведения
    $('#saveArtworkBtn').on('click', function () {
        const errors = validateAddArtworkForm();
        if (errors.length > 0) {
            showErrors(errors);
            return;
        }

        const formData = new FormData();
        formData.append('title', $('#artworkTitle').val().trim());
        formData.append('author_id', parseInt($('#artworkAuthor').val()));
        formData.append('style_id', parseInt($('#artworkStyle').val()));
        formData.append('genre_id', parseInt($('#artworkGenre').val()));
        formData.append('creation_year', parseInt($('#artworkCreationYear').val()));
        formData.append('width', parseFloat($('#artworkWidth').val()));
        formData.append('height', parseFloat($('#artworkHeight').val()));
        formData.append('description', $('#artworkDescription').val().trim());

        const imageFile = $('#artworkImage')[0].files[0];
        if (imageFile) {
            formData.append('image_path', imageFile);
        }

        addArtwork(formData);
    });

    // Обработчик обновления произведения
    $('#updateArtworkBtn').on('click', function () {
        const errors = validateEditArtworkForm();
        if (errors.length > 0) {
            showErrors(errors);
            return;
        }

        const formData = new FormData();
        const id = $('#editArtworkId').val();

        formData.append('title', $('#editArtworkTitle').val().trim());
        formData.append('author_id', parseInt($('#editArtworkAuthor').val()));
        formData.append('style_id', parseInt($('#editArtworkStyle').val()));
        formData.append('genre_id', parseInt($('#editArtworkGenre').val()));
        formData.append('creation_year', parseInt($('#editArtworkCreationYear').val()));
        formData.append('width', parseFloat($('#editArtworkWidth').val()));
        formData.append('height', parseFloat($('#editArtworkHeight').val()));
        formData.append('description', $('#editArtworkDescription').val().trim());

        const imageFile = $('#editArtworkImage')[0].files[0];
        if (imageFile) {
            formData.append('image_path', imageFile);
        }

        updateArtwork(id, formData);
    });

    // Обработчик удаления произведения
    $('#confirmDeleteBtn').on('click', function () {
        const id = $(this).data('artworkId');
        if (id) {
            deleteArtwork(id);
        }
    });

    // Обработчик предпросмотра изображения при загрузке
    $('#artworkImage, #editArtworkImage').on('change', function() {
        const formGroup = $(this).closest('.form-group');
        let previewElement = formGroup.find('.image-preview');

        if (previewElement.length === 0) {
            previewElement = $('<div class="image-preview"></div>');
            formGroup.append(previewElement);
        }

        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewElement.html(`<img src="${e.target.result}" alt="Preview" style="max-width: 100%;">`);
            };
            reader.readAsDataURL(file);
        }
    });

    // Обработчик клика по миниатюре для просмотра
    $(document).on('click', '.artwork-thumbnail', function() {
        const imageUrl = $(this).data('full-image');
        $('#previewImage').attr('src', imageUrl);
        $('#imagePreviewModal').addClass('active');
    });

    // Закрытие предпросмотра изображения (только по клику вне изображения и по Esc)
    $('#imagePreviewModal').on('click', function(e) {
        if ($(e.target).is('#imagePreviewModal')) {
            $('#imagePreviewModal').removeClass('active');
            $('#previewImage').attr('src', '');
            $('body').removeClass('modal-open');
        }
    });
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('#imagePreviewModal').removeClass('active');
            $('#previewImage').attr('src', '');
            $('body').removeClass('modal-open');
        }
    });

    // Добавляем очистку ошибок при открытии модальных окон
    $('[data-modal="addArtworkModal"]').on('click', function() {
        clearErrors();
    });

    // Загрузка публичного списка произведений (если есть)
    loadPublicArtworks();
});

// Функция загрузки публичного списка произведений
function loadPublicArtworks() {
    const $list = $('#artworks-list');
    const $noMsg = $('#no-artworks-message');
    
    if (!$list.length) return;

    $list.html('<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>');
    $list.css('display', 'grid');
    if ($noMsg.length) $noMsg.hide();

    // 1) Сначала получаем все картины
    $.ajax({
        url: '/api/v1/artworks',
        method: 'GET',
        success: function(artJson) {
            const artworks = (artJson.status === 'success' && Array.isArray(artJson.data.artworks))
                ? artJson.data.artworks
                : [];

            if (!artworks.length) {
                $list.hide();
                if ($noMsg.length) $noMsg.show();
                return;
            }

            // 2) Параллельно для каждой картины запрашиваем её выставки
            const exhibitionsPromises = artworks.map(function(a) {
                return $.ajax({
                    url: `/api/v1/artworks/${a.id}/exhibitions`,
                    method: 'GET'
                }).then(function(r) {
                    return (r.status === 'success' && Array.isArray(r.data.exhibitions))
                        ? r.data.exhibitions
                        : [];
                });
            });

            // 3) Когда все запросы завершатся — рендерим карточки
            $.when.apply($, exhibitionsPromises)
                .then(function() {
                    const allExhibitions = Array.prototype.slice.call(arguments);
                    
                    $list.empty();
                    $list.css('display', 'grid');
                    if ($noMsg.length) $noMsg.hide();

                    artworks.forEach(function(a, idx) {
                        const $card = $('<div>').addClass('card').css({
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        });

                        // HTML для списка выставок (если их несколько — разделяем запятыми)
                        const exhibitions = allExhibitions[idx];
                        const exhibitionsHTML = exhibitions.length
                            ? exhibitions
                                .map(function(e) {
                                    return `<a href="/exhibitions/${e.id}/page" class="text-blue-600 hover:underline">${e.title}</a>`;
                                })
                                .join(', ')
                            : '—';

                        const cardHTML = `
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
                                <p><strong>Автор:</strong> ${a.Author.surname} ${a.Author.first_name} ${a.Author.patronymic !== "null" ? a.Author.patronymic : ''}</p>
                                <p><strong>Стиль:</strong> ${a.Style.name}</p>
                                <p><strong>Жанр:</strong> ${a.Genre.name}</p>
                                <p class="mt-2"><strong>Описание:</strong> ${a.description || '—'}</p>
                                <p class="mt-2">
                                    <strong>Выставки:</strong> ${exhibitionsHTML}
                                </p>
                            </div>
                        `;
                        
                        $card.html(cardHTML);
                        $list.append($card);
                    });
                })
                .fail(function(err) {
                    console.error('Ошибка при загрузке выставок для картин:', err);
                    $list.hide();
                    if ($noMsg.length) $noMsg.show();
                });
        },
        error: function(err) {
            console.error('Ошибка при загрузке картин:', err);
            $list.hide();
            if ($noMsg.length) $noMsg.show();
        }
    });
}

// Функция загрузки произведений
function loadArtworks(searchTerm = "") {
    // Получаем значения фильтров по году
    const yearFrom = $('#yearFrom').val();
    const yearTo = $('#yearTo').val();

    // Формируем параметры запроса
    const params = new URLSearchParams();
    if (searchTerm) {
        params.append('search', searchTerm.trim());
    }
    if (yearFrom) {
        params.append('year_from', yearFrom);
    }
    if (yearTo) {
        params.append('year_to', yearTo);
    }

    const queryString = params.toString();
    const url = `/api/v1/artworks${queryString ? `?${queryString}` : ""}`;

    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const $tbody = $('#artworksTableBody');
                $tbody.empty();

                let artworks = response.data.artworks;
                artworks.sort(function(a, b) {
                    let valueA, valueB;

                    switch(artworkCurrentSort.column) {
                        case 'id':
                            valueA = a.id;
                            valueB = b.id;
                            break;
                        case 'title':
                            valueA = a.title.toLowerCase();
                            valueB = b.title.toLowerCase();
                            break;
                        case 'author':
                            valueA = `${a.Author.surname} ${a.Author.first_name} ${a.Author.patronymic || ''}`.toLowerCase();
                            valueB = `${b.Author.surname} ${b.Author.first_name} ${b.Author.patronymic || ''}`.toLowerCase();
                            break;
                        case 'style':
                            valueA = a.Style.name.toLowerCase();
                            valueB = b.Style.name.toLowerCase();
                            break;
                        case 'genre':
                            valueA = a.Genre.name.toLowerCase();
                            valueB = b.Genre.name.toLowerCase();
                            break;
                        case 'creation_year':
                            valueA = a.creation_year;
                            valueB = b.creation_year;
                            break;
                        case 'dimensions':
                            valueA = (a.width || 0) * (a.height || 0);
                            valueB = (b.width || 0) * (b.height || 0);
                            break;
                        case 'exhibitions':
                            valueA = a.statistics.total_exhibitions;
                            valueB = b.statistics.total_exhibitions;
                            break;
                        default:
                            valueA = a.id;
                            valueB = b.id;
                            break;
                    }

                    if (artworkCurrentSort.direction === 'asc') {
                        return valueA > valueB ? 1 : -1;
                    } else {
                        return valueA < valueB ? 1 : -1;
                    }
                });

                artworks.forEach(function(artwork) {
                    // Преобразуем путь к изображению
                    const imagePath = artwork.image_path.split('/').pop(); // Получаем только имя файла
                    const imageUrl = `/media/${imagePath}`; // Путь относительно public

                    const row = `
                        <tr>
                            <td>${artwork.id}</td>
                            <td class="artwork-image-cell">
                                <img src="${imageUrl}" 
                                     alt="${artwork.title}" 
                                     class="artwork-thumbnail"
                                     data-full-image="${imageUrl}">
                            </td>
                            <td>${artwork.title}</td>
                            <td>${artwork.Author.surname} ${artwork.Author.first_name} ${artwork.Author.patronymic}</td>
                            <td>${artwork.Style.name}</td>
                            <td>${artwork.Genre.name}</td>
                            <td>${artwork.creation_year || '-'}</td>
                            <td>${artwork.width ? artwork.width + '×' + artwork.height + ' см' : '-'}</td>
                            <td>${artwork.statistics.total_exhibitions}</td>
                            <td>
                                <button class="btn btn-sm btn-primary me-2" onclick="editArtwork(${artwork.id})">
                                    <i class="fas fa-edit"></i>Изменить
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${artwork.id})">
                                    <i class="fas fa-trash"></i>Удалить
                                </button>
                            </td>
                        </tr>
                    `;
                    $tbody.append(row);
                });
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else {
                alert("Ошибка при загрузке произведений");
            }
        }
    });
}

// Функция загрузки авторов для выпадающего списка
function loadAuthors() {
    $.ajax({
        url: '/api/v1/authors',
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const authors = response.data.authors;
                const $authorSelects = $('#artworkAuthor, #editArtworkAuthor');

                $authorSelects.empty();
                authors.forEach(function(author) {
                    const option = `<option value="${author.id}">${author.surname} ${author.first_name} ${author.patronymic !== null ? author.patronymic : ''}</option>`;
                    $authorSelects.append(option);
                });
            }
        }
    });
}

// Функция загрузки стилей для выпадающего списка
function loadStyles() {
    $.ajax({
        url: '/api/v1/styles',
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const styles = response.data.styles;
                const $styleSelects = $('#artworkStyle, #editArtworkStyle');

                $styleSelects.empty();
                styles.forEach(function(style) {
                    const option = `<option value="${style.id}">${style.name}</option>`;
                    $styleSelects.append(option);
                });
            }
        }
    });
}

// Функция загрузки жанров для выпадающего списка
function loadGenres() {
    $.ajax({
        url: '/api/v1/genres',
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const genres = response.data.genres;
                const $genreSelects = $('#artworkGenre, #editArtworkGenre');

                $genreSelects.empty();
                genres.forEach(function(genre) {
                    const option = `<option value="${genre.id}">${genre.name}</option>`;
                    $genreSelects.append(option);
                });
            }
        }
    });
}

// Функция для очистки ошибок
function clearErrors() {
    $('.error-message').text('');
    $('.form-group').removeClass('error');
    $('.form-group input, .form-group select, .form-group textarea').removeClass('error');
}

// Функция для отображения ошибок
function showErrors(errors) {
    clearErrors();
    if (errors && errors.length > 0) {
        errors.forEach(function(error) {
            const field = error.field;
            const message = error.message;
            const $formGroup = $(`#${field}`).closest('.form-group');
            $formGroup.addClass('error');
            $(`#${field}`).addClass('error');
            $(`#${field}Error`).text(message);
        });
    }
}

// Функция валидации формы добавления произведения
function validateAddArtworkForm() {
    const title = $('#artworkTitle').val().trim();
    const author_id = $('#artworkAuthor').val();
    const style_id = $('#artworkStyle').val();
    const genre_id = $('#artworkGenre').val();
    const creation_year = $('#artworkCreationYear').val();
    const width = $('#artworkWidth').val();
    const height = $('#artworkHeight').val();
    const description = $('#artworkDescription').val().trim();
    const image = $('#artworkImage')[0].files[0];

    const errors = [];

    if (!title) {
        errors.push({ field: 'artworkTitle', message: 'Название произведения обязательно' });
    } else if (title.length < 2 || title.length > 100) {
        errors.push({ field: 'artworkTitle', message: 'Название должно быть от 2 до 100 символов' });
    }

    if (!author_id) {
        errors.push({ field: 'artworkAuthor', message: 'Выберите автора' });
    }

    if (!style_id) {
        errors.push({ field: 'artworkStyle', message: 'Выберите стиль' });
    }

    if (!genre_id) {
        errors.push({ field: 'artworkGenre', message: 'Выберите жанр' });
    }

    if (!creation_year) {
        errors.push({ field: 'artworkCreationYear', message: 'Год создания произведения обязателен' });
    } else {
        const year = parseInt(creation_year);
        if (isNaN(year) || year > new Date().getFullYear()) {
            errors.push({ field: 'artworkCreationYear', message: 'Неверный год создания' });
        }
    }

    if (!width) {
        errors.push({ field: 'artworkWidth', message: 'Ширина произведения обязательна' });
    } else {
        const widthValue = parseFloat(width);
        if (isNaN(widthValue) || widthValue <= 0) {
            errors.push({ field: 'artworkWidth', message: 'Ширина должна быть положительным числом' });
        }
    }

    if (!height) {
        errors.push({ field: 'artworkHeight', message: 'Высота произведения обязательна' });
    } else {
        const heightValue = parseFloat(height);
        if (isNaN(heightValue) || heightValue <= 0) {
            errors.push({ field: 'artworkHeight', message: 'Высота должна быть положительным числом' });
        }
    }

    if (description && description.length > 2000) {
        errors.push({ field: 'artworkDescription', message: 'Описание не должно превышать 2000 символов' });
    }

    if (!image) {
        errors.push({ field: 'artworkImage', message: 'Выберите изображение' });
    }

    return errors;
}

// Функция валидации формы редактирования произведения
function validateEditArtworkForm() {
    const title = $('#editArtworkTitle').val().trim();
    const author_id = $('#editArtworkAuthor').val();
    const style_id = $('#editArtworkStyle').val();
    const genre_id = $('#editArtworkGenre').val();
    const creation_year = $('#editArtworkCreationYear').val();
    const width = $('#editArtworkWidth').val();
    const height = $('#editArtworkHeight').val();
    const description = $('#editArtworkDescription').val().trim();
    const image = $('#editArtworkImage')[0].files[0];

    const errors = [];

    if (!title) {
        errors.push({ field: 'editArtworkTitle', message: 'Название обязательно' });
    } else if (title.length < 2 || title.length > 100) {
        errors.push({ field: 'editArtworkTitle', message: 'Название должно быть от 2 до 100 символов' });
    }

    if (!author_id) {
        errors.push({ field: 'editArtworkAuthor', message: 'Выберите автора' });
    }

    if (!style_id) {
        errors.push({ field: 'editArtworkStyle', message: 'Выберите стиль' });
    }

    if (!genre_id) {
        errors.push({ field: 'editArtworkGenre', message: 'Выберите жанр' });
    }

    if (creation_year) {
        const year = parseInt(creation_year);
        if (isNaN(year) || year > new Date().getFullYear()) {
            errors.push({ field: 'editArtworkCreationYear', message: 'Неверный год создания' });
        }
    }

    if (width) {
        const widthValue = parseFloat(width);
        if (isNaN(widthValue) || widthValue <= 0) {
            errors.push({ field: 'editArtworkWidth', message: 'Ширина должна быть положительным числом' });
        }
    }

    if (height) {
        const heightValue = parseFloat(height);
        if (isNaN(heightValue) || heightValue <= 0) {
            errors.push({ field: 'editArtworkHeight', message: 'Высота должна быть положительным числом' });
        }
    }

    if (description && description.length > 2000) {
        errors.push({ field: 'editArtworkDescription', message: 'Описание не должно превышать 2000 символов' });
    }

    return errors;
}

// Функция добавления произведения
function addArtwork(formData) {
    $.ajax({
        url: '/api/v1/artworks',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.status === "success") {
                $('#addArtworkModal').removeClass('active');
                clearErrors();
                $('#addArtworkForm')[0].reset();
                $('#artworkImage').val('');
                loadArtworks();
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else if (xhr.status === 400) {
                const response = xhr.responseJSON;
                if (response.errors && response.errors.length > 0) {
                    showErrors(response.errors);
                } else {
                    alert(response.message || "Ошибка при добавлении произведения");
                }
            } else {
                alert("Ошибка при добавлении произведения");
            }
        }
    });
}

// Функция редактирования произведения
function editArtwork(id) {
    clearErrors();
    $.ajax({
        url: `/api/v1/artworks/${id}`,
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const artwork = response.data.artwork;

                $('#editArtworkId').val(artwork.id);
                $('#editArtworkTitle').val(artwork.title);
                $('#editArtworkAuthor').val(artwork.author_id);
                $('#editArtworkStyle').val(artwork.style_id);
                $('#editArtworkGenre').val(artwork.genre_id);
                $('#editArtworkCreationYear').val(artwork.creation_year);
                $('#editArtworkWidth').val(artwork.width);
                $('#editArtworkHeight').val(artwork.height);
                $('#editArtworkDescription').val(artwork.description);

                // Преобразуем путь к изображению
                const imagePath = artwork.image_path.split('/').pop();
                const imageUrl = `/media/${imagePath}`;

                // Отображаем текущее изображение
                const previewHtml = `
                    <img src="${imageUrl}" alt="${artwork.title}" style="max-width: 100%;">
                `;
                $('#currentImagePreview').html(previewHtml);

                $('#editArtworkModal').addClass('active');
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else {
                alert("Ошибка при загрузке данных произведения");
            }
        }
    });
}

// Функция обновления произведения
function updateArtwork(id, formData) {
    $.ajax({
        url: `/api/v1/artworks/${id}`,
        method: 'PATCH',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.status === "success") {
                $('#editArtworkModal').removeClass('active');
                clearErrors();
                $('#editArtworkForm')[0].reset();
                $('#editArtworkImage').val('');
                $('#currentImagePreview').empty();
                loadArtworks();
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else if (xhr.status === 400) {
                const response = xhr.responseJSON;
                if (response.errors && response.errors.length > 0) {
                    showErrors(response.errors);
                } else {
                    alert(response.message || "Ошибка при обновлении произведения");
                }
            } else {
                alert("Ошибка при обновлении произведения");
            }
        }
    });
}

// Функция удаления произведения
function deleteArtwork(id) {
    $.ajax({
        url: `/api/v1/artworks/${id}`,
        method: 'DELETE',
        success: function(response) {
            if (response.status === "success") {
                $('#deleteArtworkModal').removeClass('active');
                loadArtworks();
            } else {
                alert(response.message || "Ошибка при удалении произведения");
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else if (xhr.status === 400) {
                const response = xhr.responseJSON;
                if (response.data && response.data.exhibitions) {
                    const exhibitionsList = response.data.exhibitions
                        .map(function(ex) {
                            return `"${ex.title}"`;
                        })
                        .join(', ');
                    alert(`Невозможно удалить произведение: оно участвует в выставках: ${exhibitionsList}`);
                } else {
                    alert(response.message || "Невозможно удалить произведение");
                }
            } else if (xhr.status === 404) {
                alert("Произведение не найдено");
            } else {
                alert("Ошибка при удалении произведения");
            }
        }
    });
}

// Функция подтверждения удаления
function confirmDelete(id) {
    $('#confirmDeleteBtn').data('artworkId', id);
    $('#deleteArtworkModal').addClass('active');
}