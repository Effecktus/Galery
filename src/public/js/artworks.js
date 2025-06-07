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
    const formData = new FormData();
    
    // Добавляем все поля формы с правильным форматированием
    formData.append('title', $('#artworkTitle').val().trim());
    formData.append('author_id', parseInt($('#artworkAuthor').val()));
    formData.append('style_id', parseInt($('#artworkStyle').val()));
    formData.append('genre_id', parseInt($('#artworkGenre').val()));
    formData.append('creation_year', parseInt($('#artworkCreationYear').val()));
    formData.append('width', parseFloat($('#artworkWidth').val()));
    formData.append('height', parseFloat($('#artworkHeight').val()));
    formData.append('description', $('#artworkDescription').val().trim());
    
    // Добавляем изображение с правильным именем поля
    const imageFile = $('#artworkImage')[0].files[0];
    if (imageFile) {
        formData.append('image_path', imageFile);
    } else {
        alert('Пожалуйста, выберите изображение');
        return;
    }

    // Логируем данные формы
    console.log('Form data:');
    for (let pair of formData.entries()) {
        if (pair[0] === 'image_path') {
            console.log(pair[0] + ': [File] ' + pair[1].name);
        } else {
            console.log(pair[0] + ': ' + pair[1]);
        }
    }

    addArtwork(formData);
  });

  // Обработчик обновления произведения
  $('#updateArtworkBtn').on('click', function () {
    const formData = new FormData();
    const id = $('#editArtworkId').val();
    
    // Добавляем все поля формы
    formData.append('title', $('#editArtworkTitle').val());
    formData.append('author_id', $('#editArtworkAuthor').val());
    formData.append('style_id', $('#editArtworkStyle').val());
    formData.append('genre_id', $('#editArtworkGenre').val());
    formData.append('creation_year', $('#editArtworkCreationYear').val());
    formData.append('width', $('#editArtworkWidth').val());
    formData.append('height', $('#editArtworkHeight').val());
    formData.append('description', $('#editArtworkDescription').val());
    
    // Добавляем изображение только если оно было изменено
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
});

// Функция загрузки произведений
function loadArtworks(searchTerm = "") {
  $.ajax({
    url: `/api/v1/artworks${searchTerm ? `?search=${searchTerm}` : ""}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const tbody = $('#artworksTableBody');
        tbody.empty();

        let artworks = response.data.artworks;
        artworks.sort((a, b) => {
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
              valueA = `${a.Author.surname} ${a.Author.first_name}`.toLowerCase();
              valueB = `${b.Author.surname} ${b.Author.first_name}`.toLowerCase();
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
          const imageUrl = `/upload/${imagePath}`; // Путь относительно public
          
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
          tbody.append(row);
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
        const authorSelects = $('#artworkAuthor, #editArtworkAuthor');
        
        authorSelects.empty();
        authors.forEach(function(author) {
          const option = `<option value="${author.id}">${author.surname} ${author.first_name} ${author.patronymic}</option>`;
          authorSelects.append(option);
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
        const styleSelects = $('#artworkStyle, #editArtworkStyle');
        
        styleSelects.empty();
        styles.forEach(function(style) {
          const option = `<option value="${style.id}">${style.name}</option>`;
          styleSelects.append(option);
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
        const genreSelects = $('#artworkGenre, #editArtworkGenre');
        
        genreSelects.empty();
        genres.forEach(function(genre) {
          const option = `<option value="${genre.id}">${genre.name}</option>`;
          genreSelects.append(option);
        });
      }
    }
  });
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
        $('#addArtworkForm')[0].reset();
        $('#artworkImage').val('');
        loadArtworks();
      } else {
        alert(response.message || "Ошибка при добавлении произведения");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        console.log('Error response:', response);
        if (response.errors && response.errors.length > 0) {
          const errorMessage = response.errors.map(err => err.msg).join('\n');
          alert(errorMessage);
        } else if (response.message) {
          alert(response.message);
        } else {
          alert("Ошибка при добавлении произведения: " + JSON.stringify(response));
        }
      } else {
        console.error('Server error:', xhr.responseText);
        alert("Ошибка при добавлении произведения");
      }
    }
  });
}

// Функция редактирования произведения
function editArtwork(id) {
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
        const imagePath = artwork.image_path.split('/').pop(); // Получаем только имя файла
        const imageUrl = `/upload/${imagePath}`; // Путь относительно public
        
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
        $('#editArtworkForm')[0].reset();
        $('#editArtworkImage').val('');
        $('#currentImagePreview').empty();
        loadArtworks();
      } else {
        alert(response.message || "Ошибка при обновлении произведения");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          const errorMessage = response.errors.map(err => err.msg).join('\n');
          alert(errorMessage);
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
            .map(ex => `"${ex.title}"`)
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
