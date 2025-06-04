// Глобальные переменные
let currentSort = {
    column: 'name',
    direction: 'asc'
};

$(document).ready(function () {
    // Загрузка жанров при загрузке страницы
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
            loadGenres(searchTerm);
        }, 300); // Задержка 300мс
    });

    // Обработчик клика по заголовкам таблицы
    $('.sortable').on('click', function() {
        const column = $(this).data('column');
        
        // Если кликнули по текущему столбцу, меняем направление
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Если кликнули по новому столбцу, устанавливаем сортировку по возрастанию
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Перезагружаем данные
        loadGenres($('#searchInput').val());
    });

    // Обработчик добавления жанра
    $('#saveGenreBtn').on('click', function () {
        const name = $('#genreName').val();
        if (name) {
            addGenre(name);
        }
    });

    // Обработчик обновления жанра
    $('#updateGenreBtn').on('click', function () {
        const id = $('#editGenreId').val();
        const name = $('#editGenreName').val();
        if (id && name) {
            updateGenre(id, name);
        }
    });

    // Обработчик удаления жанра
    $('#confirmDeleteBtn').on('click', function () {
        const id = $(this).data('genreId');
        if (id) {
            deleteGenre(id);
        }
    });
});

// Функция загрузки жанров
function loadGenres(searchTerm = "") {
    $.ajax({
        url: `/api/v1/genres${searchTerm ? `?name=${searchTerm}` : ""}`,
        method: 'GET',
        success: function(response) {
            if (response.status === "success") {
                const tbody = $('#genresTableBody');
                tbody.empty();

                // Сортируем данные на клиенте
                let genres = response.data.genres;
                genres.sort((a, b) => {
                    let valueA, valueB;
                    
                    switch(currentSort.column) {
                        case 'id':
                            valueA = a.id;
                            valueB = b.id;
                            break;
                        case 'name':
                            valueA = a.name.toLowerCase();
                            valueB = b.name.toLowerCase();
                            break;
                        case 'artworks':
                            valueA = a.statistics.total_artworks;
                            valueB = b.statistics.total_artworks;
                            break;
                        default:
                            valueA = a.name.toLowerCase();
                            valueB = b.name.toLowerCase();
                    }

                    if (currentSort.direction === 'asc') {
                        return valueA > valueB ? 1 : -1;
                    } else {
                        return valueA < valueB ? 1 : -1;
                    }
                });

                genres.forEach(function(genre) {
                    const row = `
                        <tr>
                            <td>${genre.id}</td>
                            <td>${genre.name}</td>
                            <td>${genre.statistics.total_artworks}</td>
                            <td>
                                <button class="btn btn-sm btn-primary me-2" onclick="editGenre(${genre.id}, '${genre.name}')">
                                    <i class="fas fa-edit"></i>Изменить
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${genre.id})">
                                    <i class="fas fa-trash"></i>Удалить
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            }
        },
        error: function(xhr, status, error) {
            console.error("Error loading genres:", error);
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else {
                alert("Ошибка при загрузке жанров");
            }
        }
    });
}

// Функция добавления жанра
function addGenre(name) {
    $.ajax({
        url: '/api/v1/genres',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ name }),
        success: function(response) {
            if (response.status === "success") {
                // Закрываем модальное окно и очищаем форму
                $('#addGenreModal').modal('hide');
                $('#genreName').val('');

                // Перезагружаем список жанров
                loadGenres();
            } else {
                alert(response.message || "Ошибка при добавлении жанра");
            }
        },
        error: function(xhr, status, error) {
            console.error("Error adding genre:", error);
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else {
                alert("Ошибка при добавлении жанра");
            }
        }
    });
}

// Функция редактирования жанра
function editGenre(id, name) {
    $('#editGenreId').val(id);
    $('#editGenreName').val(name);
    $('#editGenreModal').modal('show');
}

// Функция обновления жанра
function updateGenre(id, name) {
    $.ajax({
        url: `/api/v1/genres/${id}`,
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify({ name }),
        success: function(response) {
            if (response.status === "success") {
                // Закрываем модальное окно
                $('#editGenreModal').modal('hide');

                // Перезагружаем список жанров
                loadGenres();
            } else {
                alert(response.message || "Ошибка при обновлении жанра");
            }
        },
        error: function(xhr, status, error) {
            console.error("Error updating genre:", error);
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else {
                alert("Ошибка при обновлении жанра");
            }
        }
    });
}

// Функция удаления жанра
function deleteGenre(id) {
    $.ajax({
        url: `/api/v1/genres/${id}`,
        method: 'DELETE',
        success: function(response) {
            if (response.status === "success") {
                // Закрываем модальное окно и возвращаем фокус
                const modal = $('#deleteGenreModal');
                modal.on('hidden.bs.modal', function () {
                    // Возвращаем фокус на первый элемент страницы
                    $('body').focus();
                });
                modal.modal('hide');

                // Перезагружаем список жанров
                loadGenres();
            } else {
                alert(response.message || "Ошибка при удалении жанра");
            }
        },
        error: function(xhr, status, error) {
            console.error("Error deleting genre:", error);
            console.log("Response:", xhr.responseJSON);
            
            if (xhr.status === 401) {
                window.location.href = '/auth/login';
            } else if (xhr.status === 400) {
                const response = xhr.responseJSON;
                if (response.errors && response.errors.length > 0) {
                    // Обработка ошибок валидации
                    const errorMessage = response.errors.map(err => err.msg).join('\n');
                    alert(errorMessage);
                } else if (response.data && response.data.artworksCount) {
                    alert(`Невозможно удалить жанр: он используется в ${response.data.artworksCount} произведениях`);
                } else {
                    alert(response?.message || "Невозможно удалить жанр");
                }
            } else if (xhr.status === 404) {
                alert("Жанр не найден");
            } else {
                alert("Ошибка при удалении жанра");
            }
        }
    });
}

// Функция подтверждения удаления
function confirmDelete(id) {
    const modal = $('#deleteGenreModal');
    $('#confirmDeleteBtn').data('genreId', id);
    
    // Обработчик открытия модального окна
    modal.on('shown.bs.modal', function () {
        // Устанавливаем фокус на кнопку "Отмена"
        $(this).find('.btn-secondary').focus();
    });
    
    // Обработчик закрытия модального окна
    modal.on('hidden.bs.modal', function () {
        // Возвращаем фокус на кнопку, которая открыла модальное окно
        $(`button[onclick="confirmDelete(${id})"]`).focus();
    });
    
    modal.modal('show');
} 