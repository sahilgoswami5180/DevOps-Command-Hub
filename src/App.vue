<script setup>
import { computed, onMounted, ref } from 'vue'

const categories = ref([])
const allCommands = ref([])
const selectedCategory = ref('all')
const searchText = ref('')
const selectedDifficulty = ref('All')
const expandedCommandId = ref(null)
const copiedCommandId = ref(null)
const isDark = ref(false)
const isMobileSidebarOpen = ref(false)
const loading = ref(true)
const loadError = ref('')

const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced']

onMounted(async () => {
    const savedTheme = localStorage.getItem('theme')
    isDark.value = savedTheme === 'dark'
    applyTheme()
    await loadData()
})

async function loadData() {
    try {
        loading.value = true
        loadError.value = ''

        const categoryResponse = await fetch('./data/categories.json')
        if (!categoryResponse.ok) {
            throw new Error('categories.json load nahi ho raha')
        }

        categories.value = await categoryResponse.json()
        const commandFiles = categories.value.filter(
            (category) => category.file
        )

        const commandGroups = await Promise.all(
            commandFiles.map(async (category) => {
                const response = await fetch(`./data/${category.file}`)
                if (!response.ok) {
                    throw new Error(`${category.file} load nahi ho raha`)
                }
                const commands = await response.json()
                return commands.map((command) => ({
                    ...command,
                    categoryId: category.id,
                }))
            })
        )

        allCommands.value = commandGroups.flat()
    } catch (error) {
        loadError.value = error.message || 'Data load karte time error aaya'
    } finally {
        loading.value = false
    }
}

function applyTheme() {
    if (isDark.value) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
    } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }
}

function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
}

function selectCategory(categoryId) {
    selectedCategory.value = categoryId
    isMobileSidebarOpen.value = false
}

function toggleCommand(commandId) {
    expandedCommandId.value =
        expandedCommandId.value === commandId ? null : commandId
}

async function copyCommand(commandId, command) {
    try {
        await navigator.clipboard.writeText(command)
        copiedCommandId.value = commandId
        setTimeout(() => {
            if (copiedCommandId.value === commandId) {
                copiedCommandId.value = null
            }
        }, 1200)
    } catch {
        copiedCommandId.value = null
        alert('Copy nahi hua. Command manually select karke copy karo.')
    }
}

function resetFilters() {
    selectedCategory.value = 'all'
    selectedDifficulty.value = 'All'
    searchText.value = ''
}

const selectedCategoryName = computed(() => {
    return (
        categories.value.find(
            (category) => category.id === selectedCategory.value
        )?.name || 'All Commands'
    )
})

const filteredCommands = computed(() => {
    const query = searchText.value.trim().toLowerCase()

    return allCommands.value.filter((item) => {
        const matchesCategory =
            selectedCategory.value === 'all' ||
            item.categoryId === selectedCategory.value
        const matchesDifficulty =
            selectedDifficulty.value === 'All' ||
            item.difficulty === selectedDifficulty.value

        const searchSource = [
            item.command,
            item.title,
            item.category,
            item.use_case,
            item.syntax,
            item.example,
            item.output_explanation,
            item.warning,
            ...(item.related_commands || []),
            ...(item.tags || []),
        ]
            .join(' ')
            .toLowerCase()

        const matchesSearch = !query || searchSource.includes(query)
        return matchesCategory && matchesDifficulty && matchesSearch
    })
})

const totalCategories = computed(
    () => categories.value.filter((category) => category.file).length
)
const totalCommands = computed(() => allCommands.value.length)
const beginnerCount = computed(
    () =>
        allCommands.value.filter((command) => command.difficulty === 'Beginner')
            .length
)
const intermediateCount = computed(
    () =>
        allCommands.value.filter(
            (command) => command.difficulty === 'Intermediate'
        ).length
)
const advancedCount = computed(
    () =>
        allCommands.value.filter((command) => command.difficulty === 'Advanced')
            .length
)

const activeCategoryCount = computed(() => {
    if (selectedCategory.value === 'all') {
        return totalCommands.value
    }
    return allCommands.value.filter(
        (command) => command.categoryId === selectedCategory.value
    ).length
})
</script>

<template>
    <div
        class="min-h-screen bg-slate-50 text-slate-950 transition dark:bg-slate-950 dark:text-slate-100"
    >
        <div class="flex min-h-screen">
            <aside
                class="fixed inset-y-0 left-0 z-40 w-80 -translate-x-full border-r border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur transition dark:border-slate-800 dark:bg-slate-900/95 lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none"
                :class="{ 'translate-x-0': isMobileSidebarOpen }"
            >
                <div class="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <div
                            class="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-500"
                        >
                            Offline
                        </div>
                        <h1 class="mt-2 text-2xl font-black tracking-tight">
                            DevOps Command Hub
                        </h1>
                        <p
                            class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
                        >
                            Hinglish DevOps command library for local system.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black dark:bg-slate-800 lg:hidden"
                        @click="isMobileSidebarOpen = false"
                    >
                        ✕
                    </button>
                </div>

                <nav class="space-y-1 overflow-y-auto pb-8">
                    <button
                        v-for="category in categories"
                        :key="category.id"
                        type="button"
                        class="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition"
                        :class="
                            selectedCategory === category.id
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        "
                        @click="selectCategory(category.id)"
                    >
                        <span>{{ category.name }}</span>
                    </button>
                </nav>
            </aside>

            <div
                v-if="isMobileSidebarOpen"
                class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                @click="isMobileSidebarOpen = false"
            ></div>

            <main class="min-w-0 flex-1">
                <header
                    class="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/85 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:px-6 lg:px-8"
                >
                    <div
                        class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                        <div class="flex items-center gap-3">
                            <button
                                type="button"
                                class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:hidden"
                                @click="isMobileSidebarOpen = true"
                            >
                                Menu
                            </button>
                            <div>
                                <p class="text-sm font-semibold text-cyan-500">
                                    Local Static Website
                                </p>
                                <h2
                                    class="text-2xl font-black tracking-tight sm:text-3xl"
                                >
                                    {{ selectedCategoryName }}
                                </h2>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            @click="toggleTheme"
                        >
                            {{ isDark ? '☀️ Light Mode' : '🌙 Dark Mode' }}
                        </button>
                    </div>
                </header>

                <section class="p-4 sm:p-6 lg:p-8">
                    <div
                        class="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 p-6 text-white shadow-xl shadow-cyan-500/20 sm:p-8"
                    >
                        <div class="max-w-3xl">
                            <p
                                class="text-sm font-black uppercase tracking-[0.3em] text-cyan-100"
                            >
                                DevOps notes
                            </p>
                            <h2
                                class="mt-3 text-3xl font-black tracking-tight sm:text-5xl"
                            >
                                Commands, use cases, warnings — sab ek jagah.
                            </h2>
                            <p
                                class="mt-4 text-sm leading-7 text-cyan-50 sm:text-base"
                            >
                                Ye app fully static hai. Commands JSON files me
                                stored hain, isliye aap manually edit karke apni
                                personal DevOps library maintain kar sakte ho.
                            </p>
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div
                            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <p
                                class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                            >
                                Total Commands
                            </p>
                            <p class="mt-2 text-3xl font-black">
                                {{ totalCommands }}
                            </p>
                        </div>
                        <div
                            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <p
                                class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                            >
                                Categories
                            </p>
                            <p class="mt-2 text-3xl font-black">
                                {{ totalCategories }}
                            </p>
                        </div>
                        <div
                            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <p
                                class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                            >
                                Beginner
                            </p>
                            <p class="mt-2 text-3xl font-black">
                                {{ beginnerCount }}
                            </p>
                        </div>
                        <div
                            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <p
                                class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                            >
                                Intermediate
                            </p>
                            <p class="mt-2 text-3xl font-black">
                                {{ intermediateCount }}
                            </p>
                        </div>
                        <div
                            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <p
                                class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                            >
                                Advanced
                            </p>
                            <p class="mt-2 text-3xl font-black">
                                {{ advancedCount }}
                            </p>
                        </div>
                    </div>

                    <div
                        class="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div
                            class="grid gap-4 lg:grid-cols-[1fr_230px_210px_auto]"
                        >
                            <input
                                v-model="searchText"
                                type="text"
                                placeholder="Search command, tag, use case..."
                                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                            />

                            <select
                                v-model="selectedCategory"
                                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option
                                    v-for="category in categories"
                                    :key="category.id"
                                    :value="category.id"
                                >
                                    {{ category.name }}
                                </option>
                            </select>

                            <select
                                v-model="selectedDifficulty"
                                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option
                                    v-for="difficulty in difficulties"
                                    :key="difficulty"
                                    :value="difficulty"
                                >
                                    {{ difficulty }}
                                </option>
                            </select>

                            <button
                                type="button"
                                class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                                @click="resetFilters"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div
                        class="mt-4 flex flex-wrap items-center justify-between gap-3"
                    >
                        <p
                            class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                        >
                            Showing {{ filteredCommands.length }} commands
                            <span v-if="selectedCategory !== 'all'"
                                >from {{ activeCategoryCount }} category
                                commands</span
                            >
                        </p>
                    </div>

                    <div
                        v-if="loading"
                        class="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"
                    >
                        <p class="text-xl font-black">Loading commands...</p>
                    </div>

                    <div
                        v-else-if="loadError"
                        class="mt-6 rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                    >
                        <p class="text-xl font-black">Data load error</p>
                        <p class="mt-2 text-sm">{{ loadError }}</p>
                        <p class="mt-4 text-sm">
                            Tip: direct HTML open mat karo. `npm run dev` ya
                            `npm run preview` use karo.
                        </p>
                    </div>

                    <div v-else class="mt-6 space-y-4">
                        <article
                            v-for="command in filteredCommands"
                            :key="command.id"
                            class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div class="p-5">
                                <div
                                    class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
                                >
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="flex flex-wrap items-center gap-2"
                                        >
                                            <span
                                                class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                                            >
                                                {{ command.category }}
                                            </span>
                                            <span
                                                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                            >
                                                {{ command.difficulty }}
                                            </span>
                                        </div>

                                        <h3 class="mt-3 text-xl font-black">
                                            {{ command.title }}
                                        </h3>
                                        <code
                                            class="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm font-bold text-cyan-200"
                                        >
                                            {{ command.command }}
                                        </code>
                                        <p
                                            class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
                                        >
                                            {{ command.use_case }}
                                        </p>
                                    </div>

                                    <div class="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            class="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                            @click="
                                                copyCommand(
                                                    command.id,
                                                    command.command
                                                )
                                            "
                                        >
                                            {{
                                                copiedCommandId === command.id
                                                    ? 'Copied'
                                                    : 'Copy'
                                            }}
                                        </button>
                                        <button
                                            type="button"
                                            class="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-black text-white transition hover:bg-cyan-600"
                                            @click="toggleCommand(command.id)"
                                        >
                                            {{
                                                expandedCommandId === command.id
                                                    ? 'Hide'
                                                    : 'Details'
                                            }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="expandedCommandId === command.id"
                                class="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60"
                            >
                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div>
                                        <p
                                            class="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
                                        >
                                            Syntax
                                        </p>
                                        <code
                                            class="mt-2 block overflow-x-auto rounded-2xl bg-white p-4 font-mono text-sm dark:bg-slate-900"
                                            >{{ command.syntax }}</code
                                        >
                                    </div>
                                    <div>
                                        <p
                                            class="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
                                        >
                                            Example
                                        </p>
                                        <code
                                            class="mt-2 block overflow-x-auto rounded-2xl bg-white p-4 font-mono text-sm dark:bg-slate-900"
                                            >{{ command.example }}</code
                                        >
                                    </div>
                                </div>

                                <div class="mt-4 grid gap-4 lg:grid-cols-2">
                                    <div
                                        class="rounded-2xl bg-white p-4 dark:bg-slate-900"
                                    >
                                        <p
                                            class="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
                                        >
                                            Output Explanation
                                        </p>
                                        <p
                                            class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
                                        >
                                            {{ command.output_explanation }}
                                        </p>
                                    </div>
                                    <div
                                        class="rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                    >
                                        <p
                                            class="text-xs font-black uppercase tracking-[0.2em]"
                                        >
                                            Warning
                                        </p>
                                        <p class="mt-2 text-sm leading-6">
                                            {{ command.warning }}
                                        </p>
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <p
                                        class="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
                                    >
                                        Related Commands
                                    </p>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        <span
                                            v-for="relatedCommand in command.related_commands"
                                            :key="relatedCommand"
                                            class="rounded-full bg-slate-200 px-3 py-1 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                            {{ relatedCommand }}
                                        </span>
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <p
                                        class="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
                                    >
                                        Tags
                                    </p>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        <span
                                            v-for="tag in command.tags"
                                            :key="tag"
                                            class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                                        >
                                            #{{ tag }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    </div>
</template>
